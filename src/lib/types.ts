export type Patient = {
  id: string;
  name: string;
  alter: number;
  geschlecht: string | null;
  zimmer: string;
  bereich: string;
  diagnose: string;
  aufnahme_datum: string;
};

export type Highlight = { level: "kritisch" | "beachten" | "info"; text: string };
export type Messwert = { typ: string; wert: number | null; wert2: number | null; status: "gemessen" | "nicht_erhoben" };
export type Warnung = { level: "rot" | "gelb"; text: string };
export type Aufgabe = { id?: string; text: string; faellig: string | null; erledigt?: boolean };

export type Entwurf = {
  id: string;
  patient: Patient;
  status: "entwurf" | "bestaetigt" | "uebernommen";
  transkript_abschnitt: string | null;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  highlights: Highlight[];
  vitals: Messwert[];
  warnings: Warnung[];
  tasks: Aufgabe[];
};
