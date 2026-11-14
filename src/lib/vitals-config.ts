// Alle Messwert-Arten an EINER Stelle. Ein neuer Wert (z. B. Blutzucker) = ein neuer Eintrag hier.
// Grenzwerte: allgemeine Richtwerte für Erwachsene – vor der Demo gegenprüfen!
// Zwischen "normal" und "kritisch" liegt der Kulanzbereich (gelb).

export type Grenzen = {
  normal: { min: number; max: number };
  kritisch: { unter: number; ueber: number }; // < unter oder > ueber = kritisch
};

export type VitalDef = {
  typ: string;
  label: string;
  einheit: string;
  pflicht: boolean;
  /** Blutdruck hat zwei Werte (systolisch/diastolisch) */
  zweiWerte?: { label1: string; label2: string };
  grenzen: Grenzen;
  grenzen2?: Grenzen;
};

export const VITALS: VitalDef[] = [
  {
    typ: "blutdruck",
    label: "Blutdruck",
    einheit: "mmHg",
    pflicht: true,
    zweiWerte: { label1: "systolisch", label2: "diastolisch" },
    grenzen: { normal: { min: 100, max: 139 }, kritisch: { unter: 90, ueber: 159 } },
    grenzen2: { normal: { min: 60, max: 89 }, kritisch: { unter: 50, ueber: 99 } },
  },
  {
    typ: "puls",
    label: "Puls",
    einheit: "/min",
    pflicht: true,
    grenzen: { normal: { min: 60, max: 100 }, kritisch: { unter: 50, ueber: 120 } },
  },
  {
    typ: "schmerz",
    label: "Schmerz",
    einheit: "NRS 0–10",
    pflicht: true,
    grenzen: { normal: { min: 0, max: 3 }, kritisch: { unter: 0, ueber: 6 } },
  },
  {
    typ: "temperatur",
    label: "Temperatur",
    einheit: "°C",
    pflicht: false,
    grenzen: { normal: { min: 36.0, max: 37.5 }, kritisch: { unter: 35.5, ueber: 38.4 } },
  },
  {
    typ: "spo2",
    label: "Sauerstoffsättigung",
    einheit: "%",
    pflicht: false,
    grenzen: { normal: { min: 95, max: 100 }, kritisch: { unter: 92, ueber: 100 } },
  },
];

export const VITAL_TYPEN = VITALS.map((v) => v.typ);

export type Zone = "normal" | "kulanz" | "kritisch";

export function zone(g: Grenzen, wert: number): Zone {
  if (wert < g.kritisch.unter || wert > g.kritisch.ueber) return "kritisch";
  if (wert < g.normal.min || wert > g.normal.max) return "kulanz";
  return "normal";
}

/** Tabelle als Text für den Agenten */
export function vitalsTabelleText(): string {
  const fmt = (g: Grenzen) =>
    `normal ${g.normal.min}–${g.normal.max}, kritisch unter ${g.kritisch.unter} oder über ${g.kritisch.ueber}, dazwischen Kulanzbereich`;
  return VITALS.map((v) => {
    const head = `- ${v.typ} (${v.label}, ${v.einheit}, ${v.pflicht ? "PFLICHT" : "optional"})`;
    if (v.zweiWerte && v.grenzen2)
      return `${head}: wert = ${v.zweiWerte.label1} (${fmt(v.grenzen)}); wert2 = ${v.zweiWerte.label2} (${fmt(v.grenzen2)})`;
    return `${head}: ${fmt(v.grenzen)}`;
  }).join("\n");
}
