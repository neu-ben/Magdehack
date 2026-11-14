import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { db } from "./supabase";
import { SCHICHT_LABEL, type Sitzung } from "./session";
import { VITAL_TYPEN, VITALS, vitalsTabelleText } from "./vitals-config";

export type AgentEvent =
  | { type: "step"; text: string }
  | { type: "draft"; handoverId: string; patient: { id: string; name: string; zimmer: string } }
  | { type: "unassigned"; text: string; grund: string; vermutung?: string }
  | { type: "done"; summary: string }
  | { type: "error"; message: string };

type Patient = { id: string; name: string; alter: number; geschlecht: string | null; zimmer: string; bereich: string; diagnose: string; aufnahme_datum: string };

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const EFFORT = (process.env.CLAUDE_EFFORT || "medium") as "low" | "medium" | "high" | "xhigh" | "max";

function systemPrompt(s: Sitzung, nurPatient?: Patient): string {
  return `Du bist ein Assistent für die Schichtübergabe auf einer Station der Inneren Medizin.
Du bereitest Übergabe-ENTWÜRFE vor. Eine Pflegekraft prüft und bestätigt jeden Entwurf, bevor er gilt. Du gibst Hinweise, du triffst keine medizinischen Entscheidungen.

Kontext:
- Angemeldet: ${s.mitarbeiter.name} (${s.mitarbeiter.personalnummer})
- Datum: ${s.datum}, Schicht: ${SCHICHT_LABEL[s.schicht]}, Verantwortungsbereich: ${s.bereich}
${nurPatient ? `- Dieses Transkript gehört ausschließlich zu ${nurPatient.name}, Zimmer ${nurPatient.zimmer} (id ${nurPatient.id}).` : ""}

Ablauf:
1. Hole mit list_patients die Patienten im Verantwortungsbereich.
2. Teile das Transkript in Abschnitte pro Patient. Die Pflegekraft nennt vor jedem Patienten Name oder Zimmernummer. Ordne jeden Abschnitt eindeutig einem Patienten aus list_patients zu.
   Passt ein Abschnitt zu keinem Patienten dieser Liste, ist die Zuordnung unsicher oder gehört der Patient zu einem anderen Bereich: rufe report_unassigned mit dem wörtlichen Abschnitt auf.
3. Hole für jeden zugeordneten Patienten get_patient, get_vitals_history und get_recent_handovers. Rufe diese Werkzeuge für mehrere Patienten parallel auf.
4. Lege für jeden zugeordneten Patienten genau einen Entwurf mit propose_handover an.

Inhalt eines Entwurfs:
- SBAR: situation (aktuelle Lage), background (relevante Vorgeschichte/Diagnose), assessment (deine Einschätzung inklusive Verlauf/Trend), recommendation (was die nächste Schicht tun sollte). Kurz, sachlich, Pflegesprache, jeweils 1–3 Sätze.
- vitals: nur Werte, die im Abschnitt genannt werden, als Zahlen. Blutdruck: wert = systolisch, wert2 = diastolisch. Gesprochene Zahlen in Ziffern umwandeln ("hundertzweiundsiebzig" = 172).
  Fehlt ein Pflichtwert, lässt du ihn weg. Die Oberfläche fragt ihn bei der Pflegekraft ab.
- Trend: Vergleiche die neuen Werte mit dem Verlauf aus get_vitals_history. Beschreibe Trends mit den konkreten Zahlen (z. B. "138 → 149 → 158 → 172 mmHg").
- Bewertung der Werte: Grundlage ist diese Tabelle mit allgemeinen Werten für Erwachsene:
${vitalsTabelleText()}
  Beurteile jeden Wert im Kontext des Patienten: Alter, Diagnose, bekannte Vorerkrankungen und der bisherige Verlauf. Ein Wert im Kulanzbereich oder ein bekannter, stabiler Ausgangswert (z. B. erhöhter Puls bei bekanntem Vorhofflimmern, Sättigung 88–92 % bei COPD) ist weniger auffällig als eine neue Veränderung. Begründe deine Einordnung in einem Halbsatz.
- highlights: die wichtigsten Punkte zum schnellen Überblick, jeweils mit Stufe:
  kritisch = Messwert kritisch oder deutliche Verschlechterung, Sturz, Arzt sollte informiert werden
  beachten = neue/geänderte Medikamente, Schmerzen, offene Untersuchungen, Ernährung/Flüssigkeit, Sturzrisiko
  info = Angehörige, geplante Entlassung, Organisatorisches
- warnings: nur für echte Auffälligkeiten. rot = sollte zeitnah ärztlich abgeklärt werden, gelb = beobachten. Formuliere als Hinweis mit Begründung, z. B. "Blutdruck seit 4 Schichten steigend (138 → 172 mmHg), dazu Kopfschmerz – Arzt informieren?".
- tasks: konkrete Aufgaben für die nächste Schicht mit Zeitpunkt, falls genannt.

Arbeite selbstständig ohne Rückfragen. Schreibe zum Schluss eine kurze Zusammenfassung in 1–2 Sätzen.`;
}

export async function runHandoverAgent(opts: {
  sitzung: Sitzung;
  transkript: string;
  /** Nur für diesen Patienten auswerten (Neu-Einsprechen oder manuelle Zuordnung) */
  patientId?: string;
  emit: (e: AgentEvent) => void;
}): Promise<void> {
  const { sitzung, transkript, emit } = opts;
  const supa = db();

  const { data: patienten, error } = await supa
    .from("patients")
    .select("*")
    .eq("bereich", sitzung.bereich)
    .order("zimmer");
  if (error) throw error;
  const imBereich = new Map((patienten as Patient[]).map((p) => [p.id, p]));
  const nurPatient = opts.patientId ? imBereich.get(opts.patientId) : undefined;
  if (opts.patientId && !nurPatient) throw new Error("Patient liegt nicht in deinem Bereich");

  const pruefe = (id: string): Patient => {
    const p = imBereich.get(id);
    if (!p) throw new Error(`Patient ${id} ist nicht im Bereich ${sitzung.bereich}. Nutze report_unassigned.`);
    if (nurPatient && p.id !== nurPatient.id) throw new Error(`In diesem Lauf nur ${nurPatient.name}.`);
    return p;
  };

  const listPatients = betaZodTool({
    name: "list_patients",
    description: "Patienten im Verantwortungsbereich der angemeldeten Pflegekraft (id, Name, Zimmer).",
    inputSchema: z.object({}),
    run: async () => {
      emit({ type: "step", text: `Patienten in ${sitzung.bereich} geladen (${imBereich.size})` });
      return JSON.stringify([...imBereich.values()].map(({ id, name, zimmer }) => ({ id, name, zimmer })));
    },
  });

  const getPatient = betaZodTool({
    name: "get_patient",
    description: "Stammdaten und Diagnose eines Patienten.",
    inputSchema: z.object({ patient_id: z.string() }),
    run: async ({ patient_id }) => {
      const p = pruefe(patient_id);
      emit({ type: "step", text: `Stammdaten: ${p.name}, Zimmer ${p.zimmer}` });
      return JSON.stringify(p);
    },
  });

  const getVitalsHistory = betaZodTool({
    name: "get_vitals_history",
    description: "Messwerte der letzten bestätigten Übergaben eines Patienten, älteste zuerst. Leer bei Neuaufnahme.",
    inputSchema: z.object({ patient_id: z.string(), n_schichten: z.number().int().min(1).max(10).default(3) }),
    run: async ({ patient_id, n_schichten }) => {
      const p = pruefe(patient_id);
      const { data: hs } = await supa
        .from("handovers")
        .select("id, datum, schicht")
        .eq("patient_id", p.id)
        .neq("status", "entwurf")
        .order("bestaetigt_am", { ascending: false })
        .limit(n_schichten);
      const ids = (hs ?? []).map((h) => h.id);
      const { data: vs } = ids.length
        ? await supa.from("vitals").select("handover_id, zeitpunkt, typ, wert, wert2, status").in("handover_id", ids).order("zeitpunkt")
        : { data: [] };
      emit({ type: "step", text: `Verlauf ${p.name}: ${ids.length ? `${ids.length} Schichten` : "Neuaufnahme, kein Verlauf"}` });
      if (!ids.length) return "Kein Verlauf vorhanden (Neuaufnahme).";
      return JSON.stringify(vs);
    },
  });

  const getRecentHandovers = betaZodTool({
    name: "get_recent_handovers",
    description: "Letzte bestätigte Übergaben (SBAR) eines Patienten, neueste zuerst.",
    inputSchema: z.object({ patient_id: z.string(), n: z.number().int().min(1).max(5).default(3) }),
    run: async ({ patient_id, n }) => {
      const p = pruefe(patient_id);
      const { data } = await supa
        .from("handovers")
        .select("datum, schicht, situation, assessment, recommendation, highlights")
        .eq("patient_id", p.id)
        .neq("status", "entwurf")
        .order("bestaetigt_am", { ascending: false })
        .limit(n);
      return data?.length ? JSON.stringify(data) : "Keine früheren Übergaben.";
    },
  });

  const proposeHandover = betaZodTool({
    name: "propose_handover",
    description:
      "Legt den Übergabe-Entwurf für EINEN Patienten an. Wird erst nach Bestätigung durch die Pflegekraft gültig. Erneuter Aufruf für denselben Patienten ersetzt den Entwurf.",
    inputSchema: z.object({
      patient_id: z.string(),
      transkript_abschnitt: z.string().describe("Wörtlicher Abschnitt des Transkripts zu diesem Patienten"),
      situation: z.string(),
      background: z.string(),
      assessment: z.string(),
      recommendation: z.string(),
      vitals: z
        .array(z.object({ typ: z.enum(VITAL_TYPEN as [string, ...string[]]), wert: z.number(), wert2: z.number().nullable().optional() }))
        .describe("Nur genannte Werte"),
      highlights: z.array(z.object({ level: z.enum(["kritisch", "beachten", "info"]), text: z.string() })),
      warnings: z.array(z.object({ level: z.enum(["rot", "gelb"]), text: z.string() })),
      tasks: z.array(z.object({ text: z.string(), faellig: z.string().nullable().optional() })),
    }),
    run: async (input) => {
      const p = pruefe(input.patient_id);

      // Alten Entwurf dieser Schicht ersetzen (Neu-Einsprechen, erneuter Lauf)
      await supa
        .from("handovers")
        .delete()
        .eq("patient_id", p.id)
        .eq("datum", sitzung.datum)
        .eq("schicht", sitzung.schicht)
        .eq("status", "entwurf");

      const { data: h, error: e1 } = await supa
        .from("handovers")
        .insert({
          patient_id: p.id,
          datum: sitzung.datum,
          schicht: sitzung.schicht,
          erstellt_von: sitzung.mitarbeiter.id,
          transkript_abschnitt: input.transkript_abschnitt,
          situation: input.situation,
          background: input.background,
          assessment: input.assessment,
          recommendation: input.recommendation,
          highlights: input.highlights,
          status: "entwurf",
        })
        .select("id")
        .single();
      if (e1) throw e1;

      const jetzt = new Date().toISOString();
      if (input.vitals.length) {
        const { error: e2 } = await supa.from("vitals").insert(
          input.vitals.map((v) => ({ patient_id: p.id, handover_id: h.id, zeitpunkt: jetzt, typ: v.typ, wert: v.wert, wert2: v.wert2 ?? null })),
        );
        if (e2) throw e2;
      }
      if (input.warnings.length) {
        const { error: e3 } = await supa.from("warnings").insert(input.warnings.map((w) => ({ patient_id: p.id, handover_id: h.id, ...w })));
        if (e3) throw e3;
      }
      if (input.tasks.length) {
        const { error: e4 } = await supa
          .from("tasks")
          .insert(input.tasks.map((t) => ({ patient_id: p.id, handover_id: h.id, text: t.text, faellig: t.faellig ?? null })));
        if (e4) throw e4;
      }

      const genannt = new Set(input.vitals.map((v) => v.typ));
      const fehlend = VITALS.filter((v) => v.pflicht && !genannt.has(v.typ)).map((v) => v.label);
      emit({ type: "step", text: `Entwurf angelegt: ${p.name}${fehlend.length ? ` (fehlt: ${fehlend.join(", ")})` : ""}` });
      emit({ type: "draft", handoverId: h.id, patient: { id: p.id, name: p.name, zimmer: p.zimmer } });
      return `Entwurf gespeichert.${fehlend.length ? ` Fehlende Pflichtwerte (${fehlend.join(", ")}) fragt die Oberfläche ab.` : ""}`;
    },
  });

  const reportUnassigned = betaZodTool({
    name: "report_unassigned",
    description: "Meldet einen Transkript-Abschnitt, der keinem Patienten im Verantwortungsbereich sicher zugeordnet werden kann.",
    inputSchema: z.object({
      abschnitt: z.string().describe("Wörtlicher Abschnitt"),
      grund: z.string().describe("z. B. 'Patient nicht im Bereich', 'Name unklar'"),
      vermutung: z.string().nullable().optional().describe("Vermuteter Patient, falls erkennbar"),
    }),
    run: async ({ abschnitt, grund, vermutung }) => {
      emit({ type: "unassigned", text: abschnitt, grund, vermutung: vermutung ?? undefined });
      emit({ type: "step", text: `Nicht zugeordnet: ${grund}` });
      return "Gemeldet. Die Pflegekraft ordnet den Abschnitt manuell zu.";
    },
  });

  emit({ type: "step", text: `Agent startet (${MODEL})` });

  const client = new Anthropic();
  const runner = client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    max_iterations: 12,
    output_config: { effort: EFFORT },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: systemPrompt(sitzung, nurPatient),
    tools: [listPatients, getPatient, getVitalsHistory, getRecentHandovers, proposeHandover, reportUnassigned],
    messages: [{ role: "user", content: `Transkript der Übergabe:\n\n${transkript}` }],
  });

  let last: Anthropic.Beta.BetaMessage | undefined;
  for await (const message of runner) {
    last = message;
    if (message.stop_reason === "refusal") {
      emit({ type: "error", message: "Das Modell hat die Anfrage abgelehnt." });
      return;
    }
  }
  const summary = last?.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  emit({ type: "done", summary: summary || "Fertig." });
}
