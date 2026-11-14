import { connection } from "next/server";
import { Suspense } from "react";
import { anmelden } from "./actions";
import { Otti } from "@/components/Otti";
import { db } from "@/lib/supabase";
import { heute, SCHICHT_LABEL, type Schicht } from "@/lib/session";

export default function AnmeldePage() {
  return (
    <main className="flex flex-1 flex-col px-6 pb-8 pt-14">
      <div className="flex flex-col items-center text-center">
        <Otti stimmung="freude" groesse={190} wippen />
        <h1 className="mt-4 text-5xl font-black tracking-tight text-tuerkis">otti</h1>
        <p className="mt-2 text-lg font-semibold text-grau">Schichtübergabe, die nichts verliert.</p>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-center text-xs font-extrabold uppercase tracking-widest text-grau">
          Anmelden als … <span className="normal-case tracking-normal">(Demo, ohne Passwort)</span>
        </h2>
        <Suspense fallback={<p className="text-center font-semibold text-grau">Dienstplan wird geladen …</p>}>
          <MitarbeiterListe />
        </Suspense>
      </section>
    </main>
  );
}

async function MitarbeiterListe() {
  await connection(); // Dienstplan von heute: pro Anfrage rendern, nicht vorab
  const { data, error } = await db()
    .from("dienstplan")
    .select("schicht, bereich, mitarbeiter:mitarbeiter_id (id, name, personalnummer)")
    .eq("datum", heute())
    .order("bereich");

  if (error) return <p className="text-center font-bold text-koralle">Dienstplan nicht erreichbar: {error.message}</p>;
  if (!data?.length) return <p className="text-center font-bold text-grau">Heute steht niemand im Dienstplan.</p>;

  const reihenfolge: Schicht[] = ["frueh", "spaet", "nacht"];
  const zeilen = [...data].sort(
    (a, b) => a.bereich.localeCompare(b.bereich) || reihenfolge.indexOf(a.schicht as Schicht) - reihenfolge.indexOf(b.schicht as Schicht),
  );

  return (
    <div className="flex flex-col gap-3">
      {zeilen.map((z) => {
        const m = z.mitarbeiter as unknown as { id: string; name: string; personalnummer: string };
        return (
          <form key={m.id} action={anmelden}>
            <input type="hidden" name="mitarbeiter_id" value={m.id} />
            <button className="btn-weiss w-full justify-between !normal-case !tracking-normal">
              <span className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-tuerkis-hell text-base font-black text-tuerkis">
                  {m.name.split(" ").map((t) => t[0]).join("")}
                </span>
                <span className="text-left">
                  <span className="block text-base font-extrabold text-tinte">{m.name}</span>
                  <span className="block text-xs font-bold text-grau">{m.personalnummer}</span>
                </span>
              </span>
              <span className="text-right text-xs font-extrabold text-tuerkis">
                {SCHICHT_LABEL[z.schicht as Schicht]}
                <span className="block text-grau">{z.bereich}</span>
              </span>
            </button>
          </form>
        );
      })}
    </div>
  );
}
