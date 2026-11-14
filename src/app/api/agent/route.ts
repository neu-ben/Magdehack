import { z } from "zod";
import { runHandoverAgent, type AgentEvent } from "@/lib/agent";
import { aktuelleSitzung } from "@/lib/session";

export const maxDuration = 300;

const Body = z.object({
  transkript: z.string().trim().min(1).max(20000),
  patientId: z.string().uuid().optional(),
});

// Antwort als NDJSON-Stream: eine AgentEvent-Zeile pro Schritt.
export async function POST(request: Request) {
  const sitzung = await aktuelleSitzung();
  if (!sitzung) return Response.json({ error: "Nicht angemeldet oder kein Dienst heute" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ungültige Eingabe" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: AgentEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        await runHandoverAgent({ sitzung, transkript: parsed.data.transkript, patientId: parsed.data.patientId, emit });
      } catch (err) {
        console.error("Agent-Fehler", err);
        emit({ type: "error", message: err instanceof Error ? err.message : "Unbekannter Fehler" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
