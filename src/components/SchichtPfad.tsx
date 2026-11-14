import Link from "next/link";
import { IconBoard, IconHaken, IconMikro, IconTuer } from "./Icons";
import { Otti, type OttiStimmung } from "./Otti";

// Schicht-Pfad: Zusammenfassung (Übernahme) → To Do → Übergabe → Feierabend.
// "gross": geschwungener Weg mit runden 3D-Stationen (Startseite), "klein": kompakte Leiste.

export type Stufe = 0 | 1 | 2 | 3 | 4; // Index der aktiven Station, 4 = alles erledigt

const STATIONEN = [
  { label: "Zusammenfassung", icon: <IconHaken className="h-8 w-8" /> },
  { label: "To Do", icon: <IconBoard className="h-8 w-8" /> },
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
              <span className={`whitespace-nowrap text-[10px] font-extrabold uppercase tracking-tight ${i === aktiv ? "text-koralle-dunkel" : "text-grau"}`}>{s.label}</span>
            </span>
            {i < STATIONEN.length - 1 && <span className={`mx-1 mb-4 h-1.5 flex-1 rounded-full ${i < aktiv ? "bg-tuerkis" : "bg-linie"}`} />}
          </li>
        ))}
      </ol>
    );
  }

  // Geschwungener Weg: Stationen pendeln links/rechts auf festen Koordinaten,
  // dazwischen Wege (erledigt: türkis, aktiv: wandernde Punkte, kommend: grau gepunktet).
  const B = 320; // Breite der Fläche
  const PUNKTE = [
    { x: 96, y: 40 },
    { x: 204, y: 156 },
    { x: 132, y: 272 },
    { x: 220, y: 388 },
  ];
  const H = PUNKTE[PUNKTE.length - 1].y + 64;
  const R = 36; // Radius der Station
  const weg = (i: number) => {
    const a = PUNKTE[i];
    const b = PUNKTE[i + 1];
    const y1 = a.y + R + 22; // unter dem Label
    const y2 = b.y - R - 6; // knapp über der nächsten Station
    const mitte = (y1 + y2) / 2;
    return `M ${a.x} ${y1} C ${a.x} ${mitte}, ${b.x} ${mitte}, ${b.x} ${y2}`;
  };

  return (
    <div className="relative mx-auto" style={{ width: B, height: H }}>
      <svg className="absolute inset-0" width={B} height={H} viewBox={`0 0 ${B} ${H}`} aria-hidden>
        {PUNKTE.slice(0, -1).map((_, i) => {
          const ziel = i + 1;
          if (ziel < aktiv)
            return <path key={i} d={weg(i)} fill="none" stroke="var(--color-tuerkis)" strokeWidth="8" strokeLinecap="round" />;
          if (ziel === aktiv)
            return (
              <g key={i}>
                <path d={weg(i)} fill="none" stroke="var(--color-koralle-hell)" strokeWidth="8" strokeLinecap="round" />
                <path
                  d={weg(i)}
                  fill="none"
                  stroke="var(--color-koralle)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="0.1 16"
                  className="anim-weg"
                />
              </g>
            );
          return (
            <path key={i} d={weg(i)} fill="none" stroke="var(--color-linie)" strokeWidth="6" strokeLinecap="round" strokeDasharray="0.1 14" />
          );
        })}
      </svg>

      <ol aria-label="Schicht-Fortschritt">
        {STATIONEN.map((s, i) => {
          const { x, y } = PUNKTE[i];
          const knoten = `relative grid h-[72px] w-[72px] place-items-center rounded-full border-b-[7px] ${stil(i, aktiv)}`;
          return (
            <li key={s.label} className="absolute flex w-40 flex-col items-center" style={{ left: x - 80, top: y - R }}>
              {i === aktiv && aktiv < 4 && <span className="absolute -top-2 h-[88px] w-[88px] animate-pulse rounded-full bg-koralle/15" aria-hidden />}
              {links?.[i]?.startsWith("#") ? (
                // Sprungmarke auf derselben Seite: normaler Anker, der Browser scrollt sanft
                <a
                  href={links[i]!}
                  className={`${knoten} transition-transform hover:brightness-105 active:translate-y-1 active:border-b-2`}
                  aria-current={i === aktiv ? "step" : undefined}
                  aria-label={`${s.label}: zur Aufgabenliste`}
                >
                  {i < aktiv ? <IconHaken className="h-9 w-9" /> : s.icon}
                </a>
              ) : links?.[i] ? (
                <Link
                  href={links[i]!}
                  className={`${knoten} transition-transform hover:brightness-105 active:translate-y-1 active:border-b-2`}
                  aria-current={i === aktiv ? "step" : undefined}
                  aria-label={`${s.label} öffnen`}
                >
                  {i < aktiv ? <IconHaken className="h-9 w-9" /> : s.icon}
                </Link>
              ) : (
                <span className={knoten} aria-current={i === aktiv ? "step" : undefined}>
                  {i < aktiv ? <IconHaken className="h-9 w-9" /> : s.icon}
                </span>
              )}
              <span
                className={`relative mt-1 whitespace-nowrap rounded-md bg-white px-1 text-xs font-extrabold uppercase tracking-wider ${
                  i === aktiv ? "text-koralle-dunkel" : i < aktiv ? "text-tuerkis-dunkel" : "text-grau"
                }`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Otti sitzt neben der aktiven Station */}
      {(() => {
        const i = Math.min(aktiv, 3);
        const { x, y } = PUNKTE[i];
        // Außenseite: weg von den Wegen, die zur Mitte schwingen
        const links_ = x < B / 2 ? x - 48 - 92 : x + 48;
        return <Otti stimmung={stimmung} groesse={92} wippen className="absolute" style={{ left: links_, top: y - 50 }} />;
      })()}
    </div>
  );
}
