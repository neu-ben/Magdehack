import Link from "next/link";
import { IconBoard, IconHaken, IconMikro, IconTuer } from "./Icons";
import { Otti, type OttiStimmung } from "./Otti";

// Schicht-Pfad: Übernommen → Versorgen → Übergabe → Feierabend.
// "gross": geschwungener Weg mit runden 3D-Stationen (Startseite), "klein": kompakte Leiste.

export type Stufe = 0 | 1 | 2 | 3 | 4; // Index der aktiven Station, 4 = alles erledigt

const STATIONEN = [
  { label: "Übernommen", icon: <IconHaken className="h-8 w-8" /> },
  { label: "Versorgen", icon: <IconBoard className="h-8 w-8" /> },
  { label: "Übergabe", icon: <IconMikro className="h-8 w-8" /> },
  { label: "Feierabend", icon: <IconTuer className="h-8 w-8" /> },
];

function stil(i: number, aktiv: Stufe) {
  if (i < aktiv) return "border-tuerkis-dunkel bg-tuerkis text-white";
  if (i === aktiv) return "border-koralle-dunkel bg-koralle text-white";
  return "border-linie bg-flaeche text-grau/60";
}

export function SchichtPfad({
  aktiv,
  stimmung = "freude",
  variante = "gross",
  links,
}: {
  aktiv: Stufe;
  stimmung?: OttiStimmung;
  variante?: "gross" | "klein";
  /** Stationen, die anklickbar sind: Index -> Ziel */
  links?: Partial<Record<number, string>>;
}) {
  if (variante === "klein") {
    return (
      <ol className="flex items-center justify-between px-1" aria-label="Schicht-Fortschritt">
        {STATIONEN.map((s, i) => (
          <li key={s.label} className="flex flex-1 items-center last:flex-none">
            <span className="flex flex-col items-center gap-1">
              <span className={`grid h-9 w-9 place-items-center rounded-full border-b-4 ${stil(i, aktiv)} [&_svg]:h-5 [&_svg]:w-5`}>
                {i < aktiv ? <IconHaken className="h-5 w-5" /> : s.icon}
              </span>
              <span className={`text-[10px] font-extrabold uppercase tracking-wide ${i === aktiv ? "text-koralle-dunkel" : "text-grau"}`}>{s.label}</span>
            </span>
            {i < STATIONEN.length - 1 && <span className={`mx-1 mb-4 h-1.5 flex-1 rounded-full ${i < aktiv ? "bg-tuerkis" : "bg-linie"}`} />}
          </li>
        ))}
      </ol>
    );
  }

  // Geschwungener Weg: Stationen pendeln links/rechts, Otti sitzt neben der aktiven Station
  const versatz = ["-translate-x-16", "translate-x-10", "-translate-x-6", "translate-x-14"];
  return (
    <ol className="relative flex flex-col items-center gap-5 py-2" aria-label="Schicht-Fortschritt">
      {STATIONEN.map((s, i) => (
        <li key={s.label} className={`relative flex flex-col items-center ${versatz[i]}`}>
          {i === aktiv && aktiv < 4 && (
            <span className="absolute -inset-2 animate-pulse rounded-full bg-koralle/15" aria-hidden />
          )}
          {links?.[i] ? (
            <Link
              href={links[i]!}
              className={`relative grid h-[72px] w-[72px] place-items-center rounded-full border-b-[7px] transition-transform hover:brightness-105 active:translate-y-1 active:border-b-2 ${stil(i, aktiv)}`}
              aria-current={i === aktiv ? "step" : undefined}
              aria-label={`${s.label} öffnen`}
            >
              {i < aktiv ? <IconHaken className="h-9 w-9" /> : s.icon}
            </Link>
          ) : (
            <span
              className={`relative grid h-[72px] w-[72px] place-items-center rounded-full border-b-[7px] ${stil(i, aktiv)}`}
              aria-current={i === aktiv ? "step" : undefined}
            >
              {i < aktiv ? <IconHaken className="h-9 w-9" /> : s.icon}
            </span>
          )}
          <span className={`mt-1 text-xs font-extrabold uppercase tracking-wider ${i === aktiv ? "text-koralle-dunkel" : i < aktiv ? "text-tuerkis-dunkel" : "text-grau"}`}>
            {s.label}
          </span>
          {i === Math.min(aktiv, 3) && (
            <Otti
              stimmung={stimmung}
              groesse={92}
              wippen
              className={`absolute top-[-10px] ${i % 2 === 0 ? "left-[96px]" : "right-[96px]"}`}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
