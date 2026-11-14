import { z } from "zod";
import { aktuelleSitzung } from "@/lib/session";
import { db } from "@/lib/supabase";

const Body = z.object({ erledigt: z.boolean() });

// Aufgabe aus der Übernahme während der Schicht abhaken (nur im eigenen Bereich)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await aktuelleSitzung();
  if (!s) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ungültige Eingabe" }, { status: 400 });

  const supa = db();
  const { data: t } = await supa.from("tasks").select("id, patients!inner(bereich)").eq("id", id).eq("patients.bereich", s.bereich).maybeSingle();
  if (!t) return Response.json({ error: "Aufgabe nicht gefunden oder nicht in deinem Bereich" }, { status: 404 });

  const { error } = await supa.from("tasks").update({ erledigt: parsed.data.erledigt }).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
