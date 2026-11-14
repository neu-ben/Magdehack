import { z } from "zod";
import { aktuelleSitzung } from "@/lib/session";
import { db } from "@/lib/supabase";

// Eigene Notizen: Patient ändern (Chip) oder löschen. Bearbeiten des Textes ist bewusst nicht vorgesehen.

const Body = z.object({ patient_id: z.string().uuid().nullable() });

async function eigeneNotiz(id: string, mitarbeiterId: string) {
  const { data } = await db().from("notizen").select("id").eq("id", id).eq("mitarbeiter_id", mitarbeiterId).maybeSingle();
  return data;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await aktuelleSitzung();
  if (!s) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ungültige Eingabe" }, { status: 400 });
  if (!(await eigeneNotiz(id, s.mitarbeiter.id))) return Response.json({ error: "Notiz nicht gefunden" }, { status: 404 });

  const supa = db();
  if (parsed.data.patient_id) {
    const { data: p } = await supa.from("patients").select("id").eq("id", parsed.data.patient_id).eq("bereich", s.bereich).maybeSingle();
    if (!p) return Response.json({ error: "Patient nicht in deinem Bereich" }, { status: 400 });
  }
  const { error } = await supa.from("notizen").update({ patient_id: parsed.data.patient_id }).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await aktuelleSitzung();
  if (!s) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  if (!(await eigeneNotiz(id, s.mitarbeiter.id))) return Response.json({ error: "Notiz nicht gefunden" }, { status: 404 });
  const { error } = await db().from("notizen").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
