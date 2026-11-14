import { vorherigeSchicht } from "@/lib/board";
import { aktuelleSitzung } from "@/lib/session";
import { db } from "@/lib/supabase";

// Übernimmt alle bestätigten Übergaben der vorherigen Schicht im eigenen Bereich (ein Button für den ganzen Flur).
export async function POST() {
  const s = await aktuelleSitzung();
  if (!s) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  const vorher = vorherigeSchicht(s.datum, s.schicht);
  const supa = db();

  const { data: patienten } = await supa.from("patients").select("id").eq("bereich", s.bereich);
  const ids = (patienten ?? []).map((p) => p.id);
  if (!ids.length) return Response.json({ uebernommen: 0 });

  const { data, error } = await supa
    .from("handovers")
    .update({ status: "uebernommen", uebernommen_von: s.mitarbeiter.id, uebernommen_am: new Date().toISOString() })
    .in("patient_id", ids)
    .eq("datum", vorher.datum)
    .eq("schicht", vorher.schicht)
    .eq("status", "bestaetigt")
    .select("id");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ uebernommen: data.length });
}
