import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { vorherigeSchicht } from "./board";
import { ladeEigeneAufgaben, ladeNotizen } from "./notizen";
import { db } from "./supabase";
import { SCHICHT_LABEL, type Sitzung } from "./session";
import type { Patient } from "./types";
import { VITAL_TYPEN, VITALS, vitalsTabelleText } from "./vitals-config";
import { uhrzeit } from "./zeit";

// Ablauf (schnell durch Parallelisierung):
// 1. Kontext laden (Patienten im Bereich, Verlauf, letzte Übergaben) – ohne Modell
// 2. Otti teilt das Transkript nach Patienten auf (ein kurzer Aufruf)
// 3. Pro Patient wertet ein "Helfer-Otter" parallel aus und legt einen Entwurf an

export type AgentEvent =
  | { type: "step"; text: string }
  | { type: "draft"; handoverId: string; patient: { id: string; name: string; zimmer: string } }
  | { type: "unassigned"; text: string; grund: string; vermutung?: string }
  | { type: "done"; summary: string }
  | { type: "error"; message: string };

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
type Effort = "low" | "medium" | "high" | "xhigh" | "max";
const EFFORT_AUSWERTUNG = (process.env.CLAUDE_EFFORT || "medium") as Effort;
const EFFORT_AUFTEILEN: Effort = "low";

const client = new Anthropic();
// Bei einer Ablehnung durch das Modell springt serverseitig automatisch ein Ersatzmodell ein
const fallback = (): { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: "default" } => ({
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
});

// ---------- Schemas ----------

const Aufteilung = z.object({
  abschnitte: z.array(
    z.object({
      patient_id: z.string().nullable().describe("id aus der Patientenliste, oder null wenn nicht sicher zuordenbar"),
      abschnitt: z.string().describe("Wörtlicher Transkript-Abschnitt"),
      grund: z.string().nullable().describe("Nur bei patient_id null: warum nicht zuordenbar"),
      vermutung: z.string().nullable().describe("Nur bei patient_id null: vermuteter Patient, falls erkennbar"),
    }),
  ),
});

const Auswertung = z.object({
  situation: z.string(),
  background: z.string(),
  assessment: z.string(),
  recommendation: z.string(),
  vitals: z.array(z.object({ typ: z.enum(VITAL_TYPEN as [string, ...string[]]), wert: z.number(), wert2: z.number().nullable() })),
  highlights: z.array(z.object({ level: z.enum(["kritisch", "beachten", "info"]), text: z.string() })),
  warnings: z.array(z.object({ level: z.enum(["rot", "gelb"]), text: z.string() })),
  tasks: z.array(z.object({ text: z.string(), faellig: z.string().nullable() })),
});
type AuswertungT = z.infer<typeof Auswertung>;

// ---------- Prompts ----------

function aufteilenSystem(s: Sitzung) {
  return `Du teilst das Transkript einer pflegerischen Schichtübergabe (${SCHICHT_LABEL[s.schicht]}, ${s.bereich}) in Abschnitte pro Patient.
Die Pflegekraft nennt vor jedem Patienten Name oder Zimmernummer. Ordne jeden Abschnitt genau einem Patienten aus der Patientenliste zu.
Passt ein Abschnitt zu keinem Patienten der Liste, ist die Zuordnung unsicher oder gehört der Patient zu einem anderen Bereich: patient_id = null, mit Grund.
Übernimm die Abschnitte wörtlich. Jeder Teil des Transkripts landet in genau einem Abschnitt.`;
}

function auswertenSystem() {
  return `Du bist Otti, ein Assistent für die pflegerische Schichtübergabe auf einer Station der Inneren Medizin.
Du erstellst den ENTWURF der Übergabe für EINEN Patienten. Eine Pflegekraft prüft und bestätigt ihn. Du gibst Hinweise, du triffst keine medizinischen Entscheidungen.

- SBAR: situation (aktuelle Lage), background (relevante Vorgeschichte/Diagnose), assessment (Einschätzung inklusive Verlauf/Trend), recommendation (was die nächste Schicht tun sollte). Pflegesprache, jeweils 1–2 kurze Sätze.
- vitals: nur Werte, die im Abschnitt genannt werden, als Zahlen. Blutdruck: wert = systolisch, wert2 = diastolisch, sonst wert2 = null. Gesprochene Zahlen in Ziffern ("hundertzweiundsiebzig" = 172, "siebenunddreißig komma zwei" = 37.2). Fehlende Pflichtwerte lässt du weg, die Oberfläche fragt sie ab.
- Trend: Vergleiche die neuen Werte mit dem Verlauf. Nenne Trends mit konkreten Zahlen (z. B. "138 → 149 → 158 → 172 mmHg").
- Bewertung: Grundlage sind allgemeine Werte für Erwachsene:
${vitalsTabelleText()}
  Beurteile jeden Wert im Kontext dieses Patienten: Alter, Diagnose, Vorerkrankungen, bisheriger Verlauf. Ein bekannter, stabiler Ausgangswert (z. B. erhöhter Puls bei bekanntem Vorhofflimmern, Sättigung 88–92 % bei COPD) ist weniger auffällig als eine neue Veränderung. Begründe die Einordnung im assessment in einem Halbsatz.
- highlights (2–4, die wichtigsten Punkte zum schnellen Überblick):
  kritisch = Messwert kritisch oder deutliche Verschlechterung, Sturz, Arzt sollte informiert werden
  beachten = neue/geänderte Medikamente, Schmerzen, offene Untersuchungen, Ernährung/Flüssigkeit, Sturzrisiko
  info = Angehörige, geplante Entlassung, Organisatorisches
- warnings: Hinweise für die übernehmende Schicht. rot = zeitnah ärztlich abklären, gelb = beobachten. Jeder kritische Punkt aus highlights bekommt eine rote Warnung. Formuliere als Hinweis mit Begründung und Frage, z. B. "Blutdruck seit 4 Schichten steigend (138 → 172 mmHg), dazu Kopfschmerz – Arzt informieren?".
- tasks: konkrete Aufgaben für die nächste Schicht, mit Zeitpunkt falls genannt.
- Offene Aufgaben (aus der Übernahme oder selbst angelegt): Erwähnt der Abschnitt oder eine Notiz, dass eine davon erledigt ist, ist sie erledigt. Sonst übernimm sie in tasks für die nächste Schicht und markiere sie mit einem beachten-Highlight, z. B. "Blutdruck-Kontrolle 07:00 nicht abgehakt – erledigt?".
- Notizen der Pflegekraft aus dieser Schicht (mit Uhrzeit) gehören zur Übergabe dazu, auch wenn sie im Abschnitt nicht wiederholt werden. Baue sie in SBAR, highlights, warnings und tasks ein. Messwerte aus Notizen übernimmst du in vitals, wenn der Abschnitt keinen neueren Wert desselben Typs nennt (pro Typ nur der neueste Wert). Ältere Werte nennst du im assessment mit Uhrzeit.`;
}

// ---------- Kontext ----------

type Kontext = {
  verlauf: unknown[];
  letzte: unknown[];
  offeneAufgaben: { text: string; faellig: string | null; quelle: "übernahme" | "eigene" }[];
  notizen: { uhrzeit: string; text: string }[];
};

export async function ladeKontext(s: Sitzung, patienten: Patient[]): Promise<Map<string, Kontext>> {
  const supa = db();
  const ids = patienten.map((p) => p.id);
  const vorher = vorherigeSchicht(s.datum, s.schicht);
  const [notizen, eigeneAufgaben] = await Promise.all([ladeNotizen(s), ladeEigeneAufgaben(s)]);
  const { data: hs } = await supa
    .from("handovers")
    .select(
      "id, patient_id, datum, schicht, situation, assessment, recommendation, bestaetigt_am, vitals (zeitpunkt, typ, wert, wert2, status), tasks (text, faellig, erledigt)",
    )
    .in("patient_id", ids)
    .neq("status", "entwurf")
    .order("bestaetigt_am", { ascending: false });
  const map = new Map<string, Kontext>();
  for (const p of patienten) {
    const eigene = (hs ?? []).filter((h) => h.patient_id === p.id).slice(0, 3);
    // Aufgaben aus der Übernahme, die in dieser Schicht nicht abgehakt wurden
    const uebernommen = (hs ?? []).find((h) => h.patient_id === p.id && h.datum === vorher.datum && h.schicht === vorher.schicht);
    map.set(p.id, {
      offeneAufgaben: [
        ...(uebernommen?.tasks ?? []).filter((t) => !t.erledigt).map(({ text, faellig }) => ({ text, faellig, quelle: "übernahme" as const })),
        ...eigeneAufgaben.filter((t) => t.patient_id === p.id && !t.erledigt).map(({ text, faellig }) => ({ text, faellig, quelle: "eigene" as const })),
      ],
      notizen: notizen.filter((n) => n.patient_id === p.id).map((n) => ({ uhrzeit: uhrzeit(n.created_at), text: n.text })),
      verlauf: eigene
        .flatMap((h) => (h.vitals ?? []).map((v) => ({ schicht: `${h.datum} ${h.schicht}`, ...v })))
        .sort((a, b) => String(a.zeitpunkt).localeCompare(String(b.zeitpunkt))),
      letzte: eigene.map(({ datum, schicht, situation, assessment, recommendation }) => ({ datum, schicht, situation, assessment, recommendation })),
    });
  }
  return map;
}

// ---------- Speichern ----------

async function speichereEntwurf(s: Sitzung, p: Patient, abschnitt: string, a: AuswertungT): Promise<string> {
  const supa = db();
  await supa.from("handovers").delete().eq("patient_id", p.id).eq("datum", s.datum).eq("schicht", s.schicht).eq("status", "entwurf");
  const { data: h, error } = await supa
    .from("handovers")
    .insert({
      patient_id: p.id,
      datum: s.datum,
      schicht: s.schicht,
      erstellt_von: s.mitarbeiter.id,
      transkript_abschnitt: abschnitt,
      situation: a.situation,
      background: a.background,
      assessment: a.assessment,
      recommendation: a.recommendation,
      highlights: a.highlights,
      status: "entwurf",
    })
    .select("id")
    .single();
  if (error) throw error;
  const jetzt = new Date().toISOString();
  const ops = [
    a.vitals.length && supa.from("vitals").insert(a.vitals.map((v) => ({ ...v, patient_id: p.id, handover_id: h.id, zeitpunkt: jetzt }))),
    a.warnings.length && supa.from("warnings").insert(a.warnings.map((w) => ({ ...w, patient_id: p.id, handover_id: h.id }))),
    a.tasks.length && supa.from("tasks").insert(a.tasks.map((t) => ({ ...t, patient_id: p.id, handover_id: h.id }))),
  ].filter(Boolean);
  for (const r of await Promise.all(ops)) if (r && r.error) throw r.error;
  return h.id;
}

// ---------- Ablauf ----------

export async function runHandoverAgent(opts: {
  sitzung: Sitzung;
  transkript: string;
  /** Nur für diesen Patienten auswerten (Neu-Einsprechen oder manuelle Zuordnung) */
  patientId?: string;
  emit: (e: AgentEvent) => void;
}): Promise<void> {
  const { sitzung: s, transkript, emit } = opts;
  const t0 = Date.now();

  const { data, error } = await db().from("patients").select("*").eq("bereich", s.bereich).order("zimmer");
  if (error) throw error;
  const patienten = data as Patient[];
  const byId = new Map(patienten.map((p) => [p.id, p]));
  if (opts.patientId && !byId.has(opts.patientId)) throw new Error("Patient liegt nicht in deinem Bereich");

  // Kontext parallel zum Aufteilen laden
  const kontextPromise = ladeKontext(s, opts.patientId ? [byId.get(opts.patientId)!] : patienten);
  emit({ type: "step", text: `${patienten.length} Patienten in ${s.bereich} geladen` });

  // 1) Aufteilen
  let zuordnung: { patient: Patient; abschnitt: string }[] = [];
  let nichtZugeordnet = 0;
  if (opts.patientId) {
    zuordnung = [{ patient: byId.get(opts.patientId)!, abschnitt: transkript }];
  } else {
    emit({ type: "step", text: "Otti sortiert die Übergabe nach Patienten …" });
    const res = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: EFFORT_AUFTEILEN, format: betaZodOutputFormat(Aufteilung) },
      ...fallback(),
      system: aufteilenSystem(s),
      messages: [
        {
          role: "user",
          content: `Patientenliste:\n${JSON.stringify(patienten.map(({ id, name, zimmer }) => ({ id, name, zimmer })))}\n\nTranskript:\n${transkript}`,
        },
      ],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("Aufteilen fehlgeschlagen");
    const sammel = new Map<string, string[]>();
    for (const a of res.parsed_output.abschnitte) {
      if (a.patient_id && byId.has(a.patient_id)) {
        sammel.set(a.patient_id, [...(sammel.get(a.patient_id) ?? []), a.abschnitt]);
      } else {
        nichtZugeordnet++;
        emit({
          type: "unassigned",
          text: a.abschnitt,
          grund: a.grund ?? "Patient nicht in deinem Bereich",
          vermutung: a.vermutung ?? undefined,
        });
      }
    }
    zuordnung = [...sammel].map(([id, teile]) => ({ patient: byId.get(id)!, abschnitt: teile.join(" ") }));
    emit({
      type: "step",
      text: `${zuordnung.length} Patienten erkannt${nichtZugeordnet ? `, ${nichtZugeordnet} Abschnitt nicht zugeordnet` : ""}`,
    });
  }

  const kontext = await kontextPromise;

  // 2) Parallel auswerten
  let rot = 0;
  let fehler = 0;
  await Promise.all(
    zuordnung.map(async ({ patient: p, abschnitt }) => {
      const k = kontext.get(p.id) ?? { verlauf: [], letzte: [], offeneAufgaben: [], notizen: [] };
      emit({ type: "step", text: `Helfer-Otter wertet ${p.name} aus (${k.letzte.length ? `${k.letzte.length} Schichten Verlauf` : "Neuaufnahme"})` });
      try {
        const res = await client.beta.messages.parse({
          model: MODEL,
          max_tokens: 8000,
          output_config: { effort: EFFORT_AUSWERTUNG, format: betaZodOutputFormat(Auswertung) },
          ...fallback(),
          system: auswertenSystem(),
          messages: [
            {
              role: "user",
              content: [
                `Patient: ${JSON.stringify({ name: p.name, alter: p.alter, geschlecht: p.geschlecht, zimmer: p.zimmer, diagnose: p.diagnose, aufnahme: p.aufnahme_datum })}`,
                `Aktuelle Schicht: ${s.datum} ${SCHICHT_LABEL[s.schicht]}`,
                k.letzte.length
                  ? `Messwert-Verlauf (älteste zuerst):\n${JSON.stringify(k.verlauf)}\n\nLetzte Übergaben (neueste zuerst):\n${JSON.stringify(k.letzte)}`
                  : "Kein Verlauf vorhanden (Neuaufnahme).",
                k.offeneAufgaben.length
                  ? `Offene Aufgaben dieser Schicht (NICHT abgehakt):\n${JSON.stringify(k.offeneAufgaben)}`
                  : "",
                k.notizen.length ? `Notizen der Pflegekraft aus dieser Schicht:\n${JSON.stringify(k.notizen)}` : "",
                `Transkript-Abschnitt dieser Schicht:\n${abschnitt}`,
              ].filter(Boolean).join("\n\n"),
            },
          ],
        });
        if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("keine Auswertung");
        const a = res.parsed_output;
        // Sicherheitsnetz: Kritisches ohne rote Warnung bekommt eine, damit es im Übernahme-Dialog erscheint
        if (!a.warnings.some((w) => w.level === "rot")) {
          for (const h of a.highlights.filter((x) => x.level === "kritisch")) a.warnings.unshift({ level: "rot", text: h.text });
        }
        const id = await speichereEntwurf(s, p, abschnitt, a);
        rot += a.warnings.filter((w) => w.level === "rot").length;
        const genannt = new Set(a.vitals.map((v) => v.typ));
        const fehlend = VITALS.filter((v) => v.pflicht && !genannt.has(v.typ)).map((v) => v.label);
        emit({ type: "step", text: `Entwurf fertig: ${p.name}${fehlend.length ? ` (fehlt: ${fehlend.join(", ")})` : ""}` });
        emit({ type: "draft", handoverId: id, patient: { id: p.id, name: p.name, zimmer: p.zimmer } });
      } catch (err) {
        fehler++;
        console.error("Auswertung fehlgeschlagen", p.name, err);
        emit({ type: "error", message: `${p.name}: Auswertung fehlgeschlagen. Bitte neu einsprechen.` });
      }
    }),
  );

  const sek = Math.round((Date.now() - t0) / 1000);
  emit({ type: "step", text: `Fertig in ${sek} Sekunden (${MODEL})` });
  emit({
    type: "done",
    summary: `${zuordnung.length - fehler} Entwürfe${rot ? `, ${rot} rote Warnung${rot === 1 ? "" : "en"}` : ""}${nichtZugeordnet ? `, ${nichtZugeordnet} nicht zugeordnet` : ""}.`,
  });
}
