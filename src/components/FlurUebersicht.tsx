"use client";

import type { Entwurf, Patient } from "@/lib/types";
import { IconHaken } from "./Icons";

// Übersicht aller Patienten im Bereich während der Übergabe:
// offen → erwähnt (live im Transkript erkannt) → Entwurf → bestätigt

export type FlurStatus = "offen" | "erwaehnt" | "entwurf" | "bestaetigt";

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

export function flurStatus(patienten: Patient[], uebergaben: Entwurf[], erwaehnt: Set<string>): Map<string, FlurStatus> {
  const m = new Map<string, FlurStatus>();
  for (const p of patienten) {
    const u = uebergaben.find((x) => x.patient.id === p.id);
    m.set(p.id, u ? (u.status === "entwurf" ? "entwurf" : "bestaetigt") : erwaehnt.has(p.id) ? "erwaehnt" : "offen");
  }
  return m;
}

const STIL: Record<FlurStatus, { box: string; text: string; label: string }> = {
  offen: { box: "border-linie bg-white", text: "text-grau", label: "offen" },
  erwaehnt: { box: "border-sonne bg-sonne-hell", text: "text-sonne-dunkel", label: "erwähnt" },
  entwurf: { box: "border-himmel/50 bg-himmel-hell", text: "text-himmel", label: "Entwurf" },
  bestaetigt: { box: "border-tuerkis-dunkel bg-tuerkis", text: "text-white", label: "bestätigt" },
};

export function FlurUebersicht({ bereich, patienten, status }: { bereich: string; patienten: Patient[]; status: Map<string, FlurStatus> }) {
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
      <ul className="grid grid-cols-3 gap-2">
        {sortiert.map((p) => {
          const st = status.get(p.id) ?? "offen";
          const s = STIL[st];
          return (
            <li key={p.id} className={`flex flex-col items-center rounded-2xl border-2 border-b-4 px-1 py-2 text-center transition-colors ${s.box}`}>
              <span className={`flex items-center gap-1 text-lg font-black leading-none ${st === "bestaetigt" ? "text-white" : "text-tinte"}`}>
                {st === "bestaetigt" && <IconHaken className="h-4 w-4" />}
                {p.zimmer}
              </span>
              <span className={`mt-1 w-full truncate text-xs font-extrabold ${st === "bestaetigt" ? "text-white" : "text-tinte"}`}>
                {p.name.split(" ").at(-1)}
              </span>
              <span className={`text-[10px] font-extrabold uppercase tracking-wide ${s.text}`}>{s.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
