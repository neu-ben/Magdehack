import type { Sitzung } from "./session";
import { db } from "./supabase";

// Notizen und eigene Aufgaben gehören immer einer Pflegekraft in einer Schicht.

export type Notiz = { id: string; patient_id: string | null; text: string; created_at: string };
export type EigeneAufgabe = { id: string; patient_id: string | null; text: string; faellig: string | null; erledigt: boolean };

export async function ladeNotizen(s: Sitzung): Promise<Notiz[]> {
  const { data, error } = await db()
    .from("notizen")
    .select("id, patient_id, text, created_at")
    .eq("mitarbeiter_id", s.mitarbeiter.id)
    .eq("datum", s.datum)
    .eq("schicht", s.schicht)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function ladeEigeneAufgaben(s: Sitzung): Promise<EigeneAufgabe[]> {
  const { data, error } = await db()
    .from("tasks")
    .select("id, patient_id, text, faellig, erledigt")
    .eq("mitarbeiter_id", s.mitarbeiter.id)
    .eq("datum", s.datum)
    .eq("schicht", s.schicht)
    .is("handover_id", null)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}
