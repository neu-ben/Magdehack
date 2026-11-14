import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AufnahmeApp } from "@/components/AufnahmeApp";
import { Otti } from "@/components/Otti";
import { ladeUebergaben } from "@/lib/entwuerfe";
import { aktuelleSitzung, SCHICHT_LABEL, type Schicht } from "@/lib/session";

const NAECHSTE: Record<Schicht, Schicht> = { frueh: "spaet", spaet: "nacht", nacht: "frueh" };

export default function AufnahmePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Otti stimmung="denkt" groesse={120} wippen />
          <p className="font-bold text-grau">Otti holt deinen Dienstplan …</p>
        </div>
      }
    >
      <Aufnahme />
    </Suspense>
  );
}

async function Aufnahme() {
  const s = await aktuelleSitzung();
  if (!s) redirect("/");
  const { patienten, uebergaben } = await ladeUebergaben(s);
  const datum = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(s.datum));
  return (
    <AufnahmeApp
      sitzung={{
        name: s.mitarbeiter.name,
        vorname: s.mitarbeiter.name.split(" ")[0],
        schicht: SCHICHT_LABEL[s.schicht],
        naechsteSchicht: SCHICHT_LABEL[NAECHSTE[s.schicht]],
        bereich: s.bereich,
        datum,
      }}
      patienten={patienten}
      initial={uebergaben}
    />
  );
}
