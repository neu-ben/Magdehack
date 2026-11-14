import { ladeUebergaben } from "@/lib/entwuerfe";
import { aktuelleSitzung } from "@/lib/session";

export async function GET() {
  const sitzung = await aktuelleSitzung();
  if (!sitzung) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  return Response.json(await ladeUebergaben(sitzung));
}
