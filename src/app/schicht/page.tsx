import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Otti } from "@/components/Otti";
import { SchichtApp } from "@/components/SchichtApp";
import { ladeSchicht } from "@/lib/schicht";
import { aktuelleSitzung } from "@/lib/session";

// Startseite während der Schicht: Übernahme-Popup, Schicht-Pfad, Aufgaben, Weg zur Übergabe
export default function SchichtPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Otti stimmung="denkt" groesse={120} wippen />
          <p className="font-bold text-grau">Otti holt deinen Dienstplan …</p>
        </div>
      }
    >
      <Schicht />
    </Suspense>
  );
}

async function Schicht() {
  const s = await aktuelleSitzung();
  if (!s) redirect("/");
  const { aktiv, board, info } = await ladeSchicht(s);
  return <SchichtApp key={aktiv} info={info} eintraege={board.eintraege} aktiv={aktiv} />;
}
