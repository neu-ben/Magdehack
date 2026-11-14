import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AufnahmeApp } from "@/components/AufnahmeApp";
import { Otti } from "@/components/Otti";
import { ladeSchicht } from "@/lib/schicht";
import { aktuelleSitzung } from "@/lib/session";

// Schichtende: Sprachübergabe mit Otti
export default function UebergabePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Otti stimmung="denkt" groesse={120} wippen />
          <p className="font-bold text-grau">Otti macht sich bereit …</p>
        </div>
      }
    >
      <Uebergabe />
    </Suspense>
  );
}

async function Uebergabe() {
  const s = await aktuelleSitzung();
  if (!s) redirect("/");
  const { aktiv, eigene, info, notizen } = await ladeSchicht(s);
  if (aktiv === 0) redirect("/schicht"); // erst die Vorschicht übernehmen
  return <AufnahmeApp sitzung={info} patienten={eigene.patienten} initial={eigene.uebergaben} notizen={notizen} />;
}
