import { db } from "./supabase";
import type { Sitzung } from "./session";
import type { Entwurf, Patient } from "./types";

/** Übergaben der aktuellen Schicht im Bereich der angemeldeten Pflegekraft (Entwürfe + bestätigte). */
export async function ladeUebergaben(s: Sitzung): Promise<{ patienten: Patient[]; uebergaben: Entwurf[] }> {
  const supa = db();
  const { data: patienten, error } = await supa.from("patients").select("*").eq("bereich", s.bereich).order("zimmer");
  if (error) throw error;
  const ids = (patienten ?? []).map((p) => p.id);
  if (!ids.length) return { patienten: [], uebergaben: [] };

  const { data: hs, error: e2 } = await supa
    .from("handovers")
    .select(
      "id, patient_id, status, transkript_abschnitt, situation, background, assessment, recommendation, highlights, vitals (typ, wert, wert2, status), warnings (level, text), tasks (text, faellig)",
    )
    .in("patient_id", ids)
    .eq("datum", s.datum)
    .eq("schicht", s.schicht);
  if (e2) throw e2;

  const byId = new Map((patienten as Patient[]).map((p) => [p.id, p]));
  const uebergaben = (hs ?? [])
    .map((h) => ({ ...h, patient: byId.get(h.patient_id)! }) as unknown as Entwurf)
    .sort((a, b) => a.patient.zimmer.localeCompare(b.patient.zimmer, "de", { numeric: true }));
  return { patienten: patienten as Patient[], uebergaben };
}
