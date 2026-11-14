import { z } from "zod";
import { aktuelleSitzung } from "@/lib/session";
import { db } from "@/lib/supabase";
import { VITALS, VITAL_TYPEN } from "@/lib/vitals-config";

const Body = z.object({
  situation: z.string(),
  background: z.string(),
  assessment: z.string(),
  recommendation: z.string(),
  highlights: z.array(z.object({ level: z.enum(["kritisch", "beachten", "info"]), text: z.string().min(1) })),
  vitals: z.array(
    z.object({
      typ: z.enum(VITAL_TYPEN as [string, ...string[]]),
      wert: z.number().nullable(),
      wert2: z.number().nullable(),
      status: z.enum(["gemessen", "nicht_erhoben"]),
    }),
  ),
  warnings: z.array(z.object({ level: z.enum(["rot", "gelb"]), text: z.string().min(1) })),
  tasks: z.array(z.object({ text: z.string().min(1), faellig: z.string().nullable() })),
});

// Die Pflegekraft bestätigt (ggf. korrigierten) Entwurf. Erst jetzt gilt die Übergabe.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sitzung = await aktuelleSitzung();
  if (!sitzung) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ungültige Eingabe", details: parsed.error.issues }, { status: 400 });
  const b = parsed.data;

  // Pflichtwerte: gemessen (mit Zahl) oder ausdrücklich "nicht erhoben"
  const fehlt = VITALS.filter((def) => def.pflicht).filter((def) => {
    const v = b.vitals.find((x) => x.typ === def.typ);
    if (!v) return true;
    if (v.status === "nicht_erhoben") return false;
    return v.wert == null || (def.zweiWerte && v.wert2 == null);
  });
  if (fehlt.length) return Response.json({ error: `Pflichtwerte fehlen: ${fehlt.map((f) => f.label).join(", ")}` }, { status: 422 });

  const supa = db();
  const { data: h } = await supa
    .from("handovers")
    .select("id, patient_id, status, patients!inner(bereich)")
    .eq("id", id)
    .eq("patients.bereich", sitzung.bereich)
    .maybeSingle();
  if (!h) return Response.json({ error: "Entwurf nicht gefunden oder nicht in deinem Bereich" }, { status: 404 });
  if (h.status !== "entwurf") return Response.json({ error: "Schon bestätigt" }, { status: 409 });

  const jetzt = new Date().toISOString();
  // Messwerte, Warnungen und Aufgaben durch die korrigierte Fassung ersetzen
  await supa.from("vitals").delete().eq("handover_id", id);
  await supa.from("warnings").delete().eq("handover_id", id);
  await supa.from("tasks").delete().eq("handover_id", id);

  const ops = [
    b.vitals.length &&
      supa.from("vitals").insert(
        b.vitals.map((v) => ({ ...v, patient_id: h.patient_id, handover_id: id, zeitpunkt: jetzt })),
      ),
    b.warnings.length && supa.from("warnings").insert(b.warnings.map((w) => ({ ...w, patient_id: h.patient_id, handover_id: id }))),
    b.tasks.length && supa.from("tasks").insert(b.tasks.map((t) => ({ ...t, patient_id: h.patient_id, handover_id: id }))),
  ].filter(Boolean);
  for (const r of await Promise.all(ops)) if (r && r.error) return Response.json({ error: r.error.message }, { status: 500 });

  const { error } = await supa
    .from("handovers")
    .update({
      situation: b.situation,
      background: b.background,
      assessment: b.assessment,
      recommendation: b.recommendation,
      highlights: b.highlights,
      status: "bestaetigt",
      bestaetigt_am: jetzt,
    })
    .eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
