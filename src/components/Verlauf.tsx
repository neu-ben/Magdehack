import type { VerlaufPunkt } from "@/lib/board";
import { VITALS, zone, type Zone } from "@/lib/vitals-config";

const FARBE: Record<Zone, string> = {
  normal: "var(--color-tuerkis)",
  kulanz: "var(--color-sonne-dunkel)",
  kritisch: "var(--color-koralle)",
};

/** Mini-Verlauf eines Messwerts über die letzten Schichten (Hauptwert, z. B. systolisch). */
export function Verlauf({ typ, punkte }: { typ: string; punkte: VerlaufPunkt[] }) {
  const def = VITALS.find((v) => v.typ === typ);
  if (!def || punkte.length === 0) return null;
  const B = 132;
  const H = 40;
  const werte = punkte.map((p) => p.wert);
  const min = Math.min(...werte, def.grenzen.normal.min);
  const max = Math.max(...werte, def.grenzen.normal.max);
  const x = (i: number) => (punkte.length === 1 ? B / 2 : 6 + (i * (B - 12)) / (punkte.length - 1));
  const y = (w: number) => H - 6 - ((w - min) / (max - min || 1)) * (H - 12);
  const letzter = punkte[punkte.length - 1];
  const z = zone(def.grenzen, letzter.wert);
  // Normalbereich als Band
  const bandOben = y(def.grenzen.normal.max);
  const bandUnten = y(def.grenzen.normal.min);

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 shrink-0">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-grau">{def.label}</p>
        <p className="text-base font-black leading-tight" style={{ color: FARBE[z] }}>
          {letzter.wert}
          {letzter.wert2 != null && `/${letzter.wert2}`}
        </p>
      </div>
      <svg viewBox={`0 0 ${B} ${H}`} width={B} height={H} className="shrink-0" aria-label={`Verlauf ${def.label}: ${werte.join(", ")}`}>
        <rect x="0" y={bandOben} width={B} height={Math.max(0, bandUnten - bandOben)} rx="4" fill="var(--color-tuerkis-hell)" />
        <polyline
          points={punkte.map((p, i) => `${x(i)},${y(p.wert)}`).join(" ")}
          fill="none"
          stroke="var(--color-grau)"
          strokeOpacity="0.5"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {punkte.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.wert)} r={i === punkte.length - 1 ? 4.5 : 3} fill={FARBE[zone(def.grenzen, p.wert)]} stroke="white" strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}
