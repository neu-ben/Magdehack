import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Otti } from "@/components/Otti";
import { OttiChat } from "@/components/OttiChat";
import { ladeSchicht } from "@/lib/schicht";
import { aktuelleSitzung } from "@/lib/session";

// Mit Otti reden: Notizen, Fragen und eigene Aufgaben während der Schicht
export default function OttiPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Otti stimmung="hoert" groesse={120} wippen />
          <p className="font-bold text-grau">Otti spitzt die Ohren …</p>
        </div>
      }
    >
      <OttiInhalt />
    </Suspense>
  );
}

async function OttiInhalt() {
  const s = await aktuelleSitzung();
  if (!s) redirect("/");
  const { aktiv, eigene, notizen, info } = await ladeSchicht(s);
  if (aktiv === 0) redirect("/schicht"); // erst die Vorschicht übernehmen
  return <OttiChat info={info} patienten={eigene.patienten} notizen={notizen} nurFragen={aktiv === 3} />;
}
