import { z } from "zod";
import { frageOtti, OttiGesperrt } from "@/lib/otti";
import { aktuelleSitzung } from "@/lib/session";

export const maxDuration = 60;

const Body = z.object({
  nachricht: z.string().trim().min(1).max(4000),
  verlauf: z
    .array(z.object({ rolle: z.enum(["pflege", "otti"]), text: z.string().max(4000) }))
    .max(12)
    .default([]),
});

// Eine Nachricht an Otti: speichert Notizen/Aufgaben und liefert die Antwort
export async function POST(request: Request) {
  const s = await aktuelleSitzung();
  if (!s) return Response.json({ error: "Nicht angemeldet oder kein Dienst heute" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ungültige Eingabe" }, { status: 400 });
  try {
    return Response.json(await frageOtti(s, parsed.data.nachricht, parsed.data.verlauf));
  } catch (err) {
    if (err instanceof OttiGesperrt) return Response.json({ error: err.message }, { status: 409 });
    console.error("Otti-Fehler", err);
    return Response.json({ error: "Otti ist gerade nicht erreichbar. Versuch es bitte noch einmal." }, { status: 500 });
  }
}
