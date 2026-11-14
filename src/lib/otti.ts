import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { ladeKontext } from "./agent";
import type { EigeneAufgabe, Notiz } from "./notizen";
import { ladeSchicht } from "./schicht";
import { SCHICHT_LABEL, type Sitzung } from "./session";
import { db } from "./supabase";
import { uhrzeit } from "./zeit";

// Otti-Chat während der Schicht: Ein Aufruf pro Nachricht. Otti erkennt Notiz, eigene Aufgabe,
// Frage und "Aufgabe erledigt" und liefert alles in einer festen Struktur.
// Notizen werden als Rohtext gespeichert, ausgewertet werden sie erst bei der Übergabe.

const MODEL = process.env.CLAUDE_OTTI_MODEL || "claude-opus-5-5";
const client = new Anthropic();

const OttiAusgabe = z.object({
  antwort: z.string().describe("Antwort an die Pflegekraft: 1–3 kurze Sätze, duzen"),
  notizen: z.array(
    z.object({
      patient_id: z.string().nullable().describe("id aus der Patientenliste, null = ganzer Flur"),
      text: z.string().describe("Beobachtung möglichst wörtlich, ohne Frageteil"),
    }),
  ),
  aufgaben: z.array(
    z.object({
      patient_id: z.string().nullable(),
      text: z.string().describe("Kurze Aufgabe, z. B. 'Blutdruck nachmessen'"),
      faellig: z.string().nullable().describe("Uhrzeit als HH:MM oder null"),
    }),
  ),
  abhaken: z.array(z.string()).describe("ids offener Aufgaben, die laut Nachricht erledigt sind"),
});

export type ChatZug = { rolle: "pflege" | "otti"; text: string };
export type AbhakVorschlag = { id: string; text: string; patient_id: string | null };
type OttiErgebnis = { antwort: string; notizen: Notiz[]; aufgaben: EigeneAufgabe[]; abhaken: AbhakVorschlag[] };

export class OttiGesperrt extends Error {}

function systemPrompt(s: Sitzung, nurFragen: boolean) {
  return `Du bist Otti, der Assistent von ${s.mitarbeiter.name}, Pflegekraft im ${SCHICHT_LABEL[s.schicht]}, ${s.bereich}, Station Innere Medizin.
Sie schreibt oder spricht dir kurze Nachrichten während der Schicht. Du antwortest auf Deutsch, duzt sie, freundlich und knapp (1–3 Sätze).

Eine Nachricht kann mehreres enthalten:
1. Beobachtung über einen Patienten oder den Flur → notizen. Text möglichst wörtlich, ohne Frageteil und ohne Anrede an dich. patient_id aus der Patientenliste (erkennbar an Nachname oder Zimmernummer); betrifft es keinen bestimmten Patienten: null. Eine Beobachtung wird IMMER gespeichert, auch wenn die Nachricht zusätzlich eine Frage enthält.
2. Wunsch nach einer Erinnerung oder Aufgabe für die eigene Schicht ("erinner mich", "ich muss noch", "um 16 Uhr …") → aufgaben. faellig als "HH:MM", wenn eine Uhrzeit genannt wird, sonst null. Eine Aufgabe ist keine Notiz.
3. Frage → beantworte sie NUR aus den Daten unten. Nenne konkrete Zahlen und Uhrzeiten. Steht etwas nicht in den Daten, sag ehrlich, dass du es nicht weißt. Keine Diagnosen, keine Therapie- oder Medikamentenempfehlungen; bei auffälligen Werten höchstens "Arzt informieren?".
4. Meldet die Nachricht, dass eine offene Aufgabe erledigt ist (z. B. "Blutdruck bei Müller gemessen, 140/85"), trag deren id in abhaken ein und frag in der Antwort kurz nach, ob du sie abhaken sollst. Die Beobachtung selbst (z. B. der Messwert) ist zusätzlich eine Notiz.

Erkenne Patienten großzügig: Nachname oder Zimmernummer reichen. Anrede (Herr/Frau), Vorname oder kleine Hör- und Schreibfehler der Spracherkennung können falsch sein ("Herr Müller" meint Frau Müller aus Zi. 4).
Nennt die Nachricht einen Patienten, der NICHT in der Patientenliste steht (auch nicht ähnlich), gehört er heute nicht zu ihrem Bereich: keine Notiz und keine Aufgabe dazu anlegen, sondern antworten: "<Name> gehört heute nicht zu deinem Bereich. Sag bitte der zuständigen Pflegekraft Bescheid."

In der Antwort bestätigst du kurz, was du gespeichert hast, z. B. "Notiert für Müller, Zi. 4." oder "Aufgabe angelegt: 16:00 Becker – Blutdruck nachmessen."
${
  nurFragen
    ? `
WICHTIG: Die Übergabe dieser Schicht ist bereits bestätigt. Lege KEINE notizen und KEINE aufgaben an. Enthält die Nachricht eine neue Beobachtung, antworte: "Deine Übergabe ist schon bestätigt, ich kann nichts mehr ergänzen. Sag es bitte der nächsten Schicht direkt." Fragen beantwortest du normal.`
    : ""
}`;
}

export async function frageOtti(s: Sitzung, nachricht: string, verlauf: ChatZug[]): Promise<OttiErgebnis> {
  const schicht = await ladeSchicht(s);
  if (schicht.aktiv === 0) throw new OttiGesperrt("Bitte übernimm zuerst die Vorschicht.");
  const nurFragen = schicht.aktiv === 3;

  const patienten = schicht.eigene.patienten;
  const ids = new Set(patienten.map((p) => p.id));
  const kontext = await ladeKontext(s, patienten);

  // Offene und erledigte Aufgaben: aus der Übernahme und selbst angelegt
  const aufgaben = [
    ...schicht.board.eintraege.flatMap((e) =>
      (e.uebergabe?.tasks ?? [])
        .filter((t) => t.id)
        .map((t) => ({ id: t.id!, patient_id: e.patient.id, text: t.text, faellig: t.faellig, erledigt: !!t.erledigt, quelle: "übernahme" })),
    ),
    ...schicht.eigeneAufgaben.map((t) => ({ ...t, quelle: "eigene" })),
  ];

  const daten = {
    jetzt: uhrzeit(new Date()),
    datum: s.datum,
    patienten: patienten.map((p) => {
      const e = schicht.board.eintraege.find((x) => x.patient.id === p.id);
      const k = kontext.get(p.id);
      const eigene = schicht.eigene.uebergaben.find((u) => u.patient.id === p.id);
      return {
        id: p.id,
        name: p.name,
        zimmer: p.zimmer,
        alter: p.alter,
        diagnose: p.diagnose,
        aufnahme: p.aufnahme_datum,
        uebernahme_von_vorschicht: e?.uebergabe
          ? {
              situation: e.uebergabe.situation,
              assessment: e.uebergabe.assessment,
              recommendation: e.uebergabe.recommendation,
              warnungen: e.uebergabe.warnings,
            }
          : e?.neuaufnahme
          ? "Neuaufnahme heute"
          : null,
        messwerte_verlauf: k?.verlauf ?? [],
        notizen_dieser_schicht: k?.notizen ?? [],
        uebergabe_dieser_schicht: eigene ? eigene.status : "noch nicht eingesprochen",
      };
    }),
    aufgaben,
    notizen_ohne_patient: schicht.notizen.filter((n) => !n.patient_id).map((n) => ({ uhrzeit: uhrzeit(n.created_at), text: n.text })),
  };

  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "low", format: betaZodOutputFormat(OttiAusgabe) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: `${systemPrompt(s, nurFragen)}\n\nDaten deines Bereichs:\n${JSON.stringify(daten)}`,
    messages: [
      {
        role: "user",
        content: [
          verlauf.length
            ? `Bisheriger Chat (nur für Rückbezüge):\n${verlauf.map((z) => `${z.rolle === "pflege" ? "Pflegekraft" : "Otti"}: ${z.text}`).join("\n")}`
            : "",
          `Neue Nachricht:\n${nachricht}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("Otti konnte nicht antworten");
  const a = res.parsed_output;

  // Speichern (nur eigene Patienten; nach bestätigter Übergabe nichts mehr)
  const supa = db();
  const pid = (x: string | null) => (x && ids.has(x) ? x : null);
  const basis = { mitarbeiter_id: s.mitarbeiter.id, datum: s.datum, schicht: s.schicht };
  let notizen: Notiz[] = [];
  let neueAufgaben: EigeneAufgabe[] = [];
  if (!nurFragen && a.notizen.length) {
    const { data, error } = await supa
      .from("notizen")
      .insert(a.notizen.map((n) => ({ ...basis, bereich: s.bereich, patient_id: pid(n.patient_id), text: n.text })))
      .select("id, patient_id, text, created_at");
    if (error) throw error;
    notizen = data;
  }
  if (!nurFragen && a.aufgaben.length) {
    const { data, error } = await supa
      .from("tasks")
      .insert(a.aufgaben.map((t) => ({ ...basis, patient_id: pid(t.patient_id), text: t.text, faellig: t.faellig })))
      .select("id, patient_id, text, faellig, erledigt");
    if (error) throw error;
    neueAufgaben = data;
  }
  const offen = new Map(aufgaben.filter((t) => !t.erledigt).map((t) => [t.id, t]));
  const abhaken = [...new Set(a.abhaken)]
    .filter((id) => offen.has(id))
    .map((id) => ({ id, text: offen.get(id)!.text, patient_id: offen.get(id)!.patient_id }));

  return { antwort: a.antwort, notizen, aufgaben: neueAufgaben, abhaken };
}
