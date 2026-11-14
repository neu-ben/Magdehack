import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BoardApp } from "@/components/BoardApp";
import { Otti } from "@/components/Otti";
import { ladeBoard } from "@/lib/board";
import { aktuelleSitzung, SCHICHT_LABEL } from "@/lib/session";

export default function BoardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Otti stimmung="denkt" groesse={120} wippen />
          <p className="font-bold text-grau">Otti holt die Übergabe …</p>
        </div>
      }
    >
      <Board />
    </Suspense>
  );
}

async function Board() {
  const s = await aktuelleSitzung();
  if (!s) redirect("/");
  const { vorher, eintraege } = await ladeBoard(s);
  const fmt = (d: string) => new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(new Date(d));
  return (
    <BoardApp
      info={{
        name: s.mitarbeiter.name,
        vorname: s.mitarbeiter.name.split(" ")[0],
        schicht: SCHICHT_LABEL[s.schicht],
        vorherSchicht: SCHICHT_LABEL[vorher.schicht],
        bereich: s.bereich,
        datum: vorher.datum === s.datum ? fmt(s.datum) : `${fmt(vorher.datum)}–${fmt(s.datum)}`,
      }}
      eintraege={eintraege}
    />
  );
}
