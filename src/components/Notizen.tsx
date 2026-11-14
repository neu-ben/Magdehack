"use client";

import type { Notiz } from "@/lib/notizen";
import type { Patient } from "@/lib/types";
import { uhrzeit } from "@/lib/zeit";
import { IconX } from "./Icons";

const nachname = (p: Patient) => p.name.split(" ").at(-1)!;

/** Patient als Chip; mit onChange wird daraus eine Auswahl zum Umhängen der Notiz */
export function PatientChip({
  patientId,
  patienten,
  onChange,
}: {
  patientId: string | null;
  patienten: Patient[];
  onChange?: (id: string | null) => void;
}) {
  const p = patienten.find((x) => x.id === patientId);
  const label = p ? `Zi. ${p.zimmer} · ${nachname(p)}` : "Ganzer Flur";
  const stil = "rounded-full border-2 border-tuerkis/40 bg-tuerkis-hell px-2.5 py-0.5 text-xs font-extrabold text-tuerkis-dunkel";
  if (!onChange) return <span className={stil}>{label}</span>;
  return (
    <select
      className={`${stil} cursor-pointer appearance-none pr-6 hover:border-tuerkis`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5l3 3 3-3' stroke='%230b7a77' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 6px center",
        backgroundSize: "12px",
      }}
      value={patientId ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label="Patient der Notiz ändern"
    >
      {patienten.map((x) => (
        <option key={x.id} value={x.id}>
          Zi. {x.zimmer} · {nachname(x)}
        </option>
      ))}
      <option value="">Ganzer Flur</option>
    </select>
  );
}

/** Eine Notiz im Chat: Uhrzeit, Patient (änderbar), Text, Löschen */
export function NotizKarte({
  notiz,
  patienten,
  onPatient,
  onLoeschen,
}: {
  notiz: Notiz;
  patienten: Patient[];
  onPatient?: (id: string | null) => void;
  onLoeschen?: () => void;
}) {
  return (
    <div className="anim-einblenden rounded-2xl border-2 border-b-4 border-linie bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-grau">Notiz · {uhrzeit(notiz.created_at)}</span>
        <PatientChip patientId={notiz.patient_id} patienten={patienten} onChange={onPatient} />
        {onLoeschen && (
          <button
            className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-grau hover:bg-koralle-hell hover:text-koralle-dunkel"
            onClick={onLoeschen}
            aria-label="Notiz löschen"
            title="Notiz löschen"
          >
            <IconX />
          </button>
        )}
      </div>
      <p className="mt-1 text-sm font-semibold">{notiz.text}</p>
    </div>
  );
}

/** Nur lesen: Notizen nach Patient gruppiert (Übergabe-Seite) */
export function NotizListe({ notizen, patienten }: { notizen: Notiz[]; patienten: Patient[] }) {
  const gruppen = [...patienten.map((p) => p.id as string | null), null]
    .map((id) => ({ id, liste: notizen.filter((n) => n.patient_id === id) }))
    .filter((g) => g.liste.length);
  return (
    <div className="flex flex-col gap-2">
      {gruppen.map((g) => (
        <div key={g.id ?? "flur"}>
          <PatientChip patientId={g.id} patienten={patienten} />
          <ul className="mt-1 flex flex-col gap-1">
            {g.liste.map((n) => (
              <li key={n.id} className="text-sm font-semibold">
                <span className="mr-1 text-xs font-extrabold text-tuerkis">{uhrzeit(n.created_at)}</span>
                {n.text}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
