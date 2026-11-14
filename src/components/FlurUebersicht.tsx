"use client";

import type { Entwurf, Patient } from "@/lib/types";
import { VITALS } from "@/lib/vitals-config";
import { IconHaken } from "./Icons";

// Übersicht aller Patienten im Bereich während der Übergabe:
// offen → erwähnt (live im Transkript erkannt) → Entwurf → bestätigt

type FlurStatus = "offen" | "erwaehnt" | "entwurf" | "bestaetigt";

const ZAHLWORT: Record<string, number> = {
  eins: 1, ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
  elf: 11, zwölf: 12, zwoelf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19, zwanzig: 20,
};

/** Welche Patienten werden im Transkript genannt? (Nachname oder "Zimmer 3" / "Zimmer drei") */
export function erwaehntePatienten(transkript: string, patienten: Patient[]): Set<string> {
  const t = transkript.toLowerCase();
  const zimmer = new Set<string>();
  for (const m of t.matchAll(/zimmer\s+(\d+|[a-zäöüß]+)/g)) {
    const roh = m[1];
    const nr = /^\d+$/.test(roh) ? Number(roh) : ZAHLWORT[roh];
    if (nr) zimmer.add(String(nr));
  }
  const treffer = new Set<string>();
  for (const p of patienten) {
    const nachname = p.name.split(" ").at(-1)!.toLowerCase();
    if (zimmer.has(p.zimmer) || new RegExp(`\\b${nachname}\\b`, "i").test(t)) treffer.add(p.id);
  }
  return treffer;
}

/**
 * Transkript grob nach Patienten aufteilen: alles ab einer Nennung bis zur Nennung eines anderen Patienten.
 * Nur für Live-Hinweise in der Oberfläche – die eigentliche Aufteilung macht der Agent.
 */
export function abschnitteProPatient(transkript: string, patienten: Patient[]): Map<string, string> {
  const t = transkript.toLowerCase();
  const zimmerZuId = new Map(patienten.map((p) => [p.zimmer, p.id]));
  const treffer: { pos: number; id: string }[] = [];
  for (const m of t.matchAll(/zimmer\s+(\d+|[a-zäöüß]+)/g)) {
    const roh = m[1];
    const nr = /^\d+$/.test(roh) ? Number(roh) : ZAHLWORT[roh];
    const id = nr ? zimmerZuId.get(String(nr)) : undefined;
    if (id) treffer.push({ pos: m.index, id });
  }
  for (const p of patienten) {
    const nachname = p.name.split(" ").at(-1)!.toLowerCase();
    for (const m of t.matchAll(new RegExp(`\\b${nachname}\\b`, "g"))) treffer.push({ pos: m.index, id: p.id });
  }
  treffer.sort((a, b) => a.pos - b.pos);
  const abschnitte = new Map<string, string>();
  treffer.forEach((x, i) => {
    const ende = treffer.slice(i + 1).find((y) => y.id !== x.id)?.pos ?? t.length;
    abschnitte.set(x.id, (abschnitte.get(x.id) ?? "") + " " + transkript.slice(x.pos, ende));
  });
  return abschnitte;
}

export function flurStatus(patienten: Patient[], uebergaben: Entwurf[], erwaehnt: Set<string>): Map<string, FlurStatus> {
  const m = new Map<string, FlurStatus>();
  for (const p of patienten) {
    const u = uebergaben.find((x) => x.patient.id === p.id);
    m.set(p.id, u ? (u.status === "entwurf" ? "entwurf" : "bestaetigt") : erwaehnt.has(p.id) ? "erwaehnt" : "offen");
  }
  return m;
}

const STIL: Record<FlurStatus, { kachel: string; text: string; label: string }> = {
  offen: { kachel: "border-linie bg-white text-tinte", text: "text-grau", label: "offen" },
  erwaehnt: { kachel: "border-sonne bg-sonne-hell text-tinte", text: "text-sonne-dunkel", label: "erwähnt" },
  entwurf: { kachel: "border-himmel/50 bg-himmel-hell text-tinte", text: "text-himmel", label: "Entwurf da" },
  bestaetigt: { kachel: "border-tuerkis-dunkel bg-tuerkis text-white", text: "text-tuerkis-dunkel", label: "bestätigt" },
};

/** Pflichtwerte (z. B. Blutdruck, Puls, Schmerz, Temperatur) aus der Konfiguration */
const PFLICHT = VITALS.filter((v) => v.pflicht);

/** Pflichtwerte, die im Abschnitt eines Patienten (noch) nicht vorkommen – Stichwort-Erkennung, nur ein Hinweis */
export function fehlendePflichtwerte(abschnitt: string | undefined) {
  return PFLICHT.filter((v) => !abschnitt || !v.erkennung.test(abschnitt));
}

/**
 * Der Flur während der Übergabe: eine Zeile pro Patient mit Status, Notizen und – solange es noch keinen
 * Entwurf gibt – den Pflichtwerten, die live grün werden, sobald sie genannt wurden.
 */
export function FlurUebersicht({
  bereich,
  patienten,
  status,
  notizen,
  abschnitte,
}: {
  bereich: string;
  patienten: Patient[];
  status: Map<string, FlurStatus>;
  /** Anzahl Notizen dieser Schicht pro Patient */
  notizen?: Map<string, number>;
  /** Transkript-Abschnitt pro Patient (für die Pflichtwert-Chips) */
  abschnitte: Map<string, string>;
}) {
  const sortiert = [...patienten].sort((a, b) => a.zimmer.localeCompare(b.zimmer, "de", { numeric: true }));
  const besprochen = sortiert.filter((p) => status.get(p.id) !== "offen").length;

  return (
    <section aria-label={`Patienten in ${bereich}`}>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-grau">Dein Flur · {bereich}</h2>
        <span className="text-xs font-extrabold text-tuerkis">
          {besprochen}/{sortiert.length} besprochen
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {sortiert.map((p) => {
          const st = status.get(p.id) ?? "offen";
          const s = STIL[st];
          const n = notizen?.get(p.id) ?? 0;
          const abschnitt = abschnitte.get(p.id);
          const fehlt = new Set(fehlendePflichtwerte(abschnitt).map((v) => v.typ));
          const mitChips = st === "offen" || st === "erwaehnt";
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl border-2 border-b-4 border-linie bg-white px-3 py-2.5">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-b-4 text-lg font-black transition-colors ${s.kachel}`}>
                {st === "bestaetigt" ? <IconHaken className="h-6 w-6" /> : p.zimmer}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-extrabold">
                  <span>{p.name}</span>
                  <span className={`text-[10px] font-extrabold uppercase tracking-wide ${s.text}`}>{s.label}</span>
                  {n > 0 && (
                    <span className="rounded-md bg-himmel-hell px-1.5 text-[10px] font-extrabold text-himmel">
                      {n} Notiz{n === 1 ? "" : "en"}
                      {st === "offen" && " · nicht besprochen"}
                    </span>
                  )}
                </p>
                {mitChips && (
                  <div className="mt-1.5 flex flex-wrap gap-1" aria-label="Pflichtwerte">
                    {PFLICHT.map((v) => {
                      const da = !fehlt.has(v.typ);
                      const stil = da
                        ? "border-tuerkis/40 bg-tuerkis-hell text-tuerkis-dunkel"
                        : abschnitt
                        ? "border-sonne bg-sonne-hell text-sonne-dunkel" // Patient genannt, Wert fehlt noch
                        : "border-linie bg-flaeche text-grau"; // Patient noch gar nicht genannt
                      return (
                        <span key={v.typ} className={`flex items-center gap-0.5 rounded-full border-2 px-1.5 py-0.5 text-[11px] font-extrabold transition-colors ${stil}`}>
                          {da && <IconHaken className="h-3 w-3" />}
                          {v.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
