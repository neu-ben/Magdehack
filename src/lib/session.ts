import { cookies } from "next/headers";
import { db } from "./supabase";

// Login-Mock-up: Die angemeldete Pflegekraft steht in einem Cookie. Kein Passwort.
export const SESSION_COOKIE = "mitarbeiter_id";

export type Schicht = "frueh" | "spaet" | "nacht";

export type Sitzung = {
  mitarbeiter: { id: string; name: string; personalnummer: string };
  datum: string; // YYYY-MM-DD
  schicht: Schicht;
  bereich: string;
};

export const SCHICHT_LABEL: Record<Schicht, string> = {
  frueh: "Frühdienst",
  spaet: "Spätdienst",
  nacht: "Nachtdienst",
};

/** Heutiges Datum in deutscher Zeit (YYYY-MM-DD) */
export function heute(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
}

/** Schicht und Bereich kommen aus dem Dienstplan (steht stellvertretend für z. B. SAP). */
export async function sitzungFuer(mitarbeiterId: string): Promise<Sitzung | null> {
  const supa = db();
  const { data: m } = await supa
    .from("mitarbeiter")
    .select("id, name, personalnummer")
    .eq("id", mitarbeiterId)
    .maybeSingle();
  if (!m) return null;
  const { data: d } = await supa
    .from("dienstplan")
    .select("schicht, bereich, datum")
    .eq("mitarbeiter_id", mitarbeiterId)
    .eq("datum", heute())
    .limit(1)
    .maybeSingle();
  if (!d) return null;
  return { mitarbeiter: m, datum: d.datum, schicht: d.schicht as Schicht, bereich: d.bereich };
}

export async function aktuelleSitzung(): Promise<Sitzung | null> {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  return id ? sitzungFuer(id) : null;
}
