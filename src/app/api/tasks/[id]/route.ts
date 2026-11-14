import { z } from "zod";
import { aktuelleSitzung, type Sitzung } from "@/lib/session";
import { db } from "@/lib/supabase";

const Body = z.object({ erledigt: z.boolean() });

/** Eigene Aufgabe (über Otti angelegt) oder Aufgabe eines Patienten im eigenen Bereich */
async function erlaubteAufgabe(id: string, s: Sitzung) {
  const { data: t } = await db().from("tasks").select("id, handover_id, mitarbeiter_id, patients(bereich)").eq("id", id).maybeSingle();
  if (!t) return null;
  const eigene = t.handover_id === null && t.mitarbeiter_id === s.mitarbeiter.id;
  const patient = t.patients as unknown as { bereich: string } | null;
  return eigene || patient?.bereich === s.bereich ? { eigene } : null;
}

// Aufgabe während der Schicht abhaken
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await aktuelleSitzung();
  if (!s) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ungültige Eingabe" }, { status: 400 });
  if (!(await erlaubteAufgabe(id, s))) return Response.json({ error: "Aufgabe nicht gefunden oder nicht in deinem Bereich" }, { status: 404 });

  const { error } = await db().from("tasks").update({ erledigt: parsed.data.erledigt }).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

// Eigene Aufgabe rückgängig machen (nur selbst angelegte)
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await aktuelleSitzung();
  if (!s) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  if (!(await erlaubteAufgabe(id, s))?.eigene) return Response.json({ error: "Nur eigene Aufgaben können gelöscht werden" }, { status: 403 });
  const { error } = await db().from("tasks").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
