import { ladeBoard } from "./board";
import { ladeUebergaben } from "./entwuerfe";
import { SCHICHT_LABEL, type Schicht, type Sitzung } from "./session";

const NAECHSTE: Record<Schicht, Schicht> = { frueh: "spaet", spaet: "nacht", nacht: "frueh" };

/** Alles, was Startseite und Übergabe-Seite über den Stand der Schicht wissen müssen. */
export async function ladeSchicht(s: Sitzung) {
  const [board, eigene] = await Promise.all([ladeBoard(s), ladeUebergaben(s)]);

  // 0 Übernehmen → 1 Versorgen → 2 Übergabe → 3 Feierabend
  const uebernahmeOffen = board.eintraege.some((e) => e.uebergabe?.status === "bestaetigt");
  const begonnen = eigene.uebergaben.length > 0;
  const fertig = begonnen && eigene.uebergaben.every((u) => u.status !== "entwurf");
  const aktiv = (uebernahmeOffen ? 0 : !begonnen ? 1 : !fertig ? 2 : 3) as 0 | 1 | 2 | 3;

  const fmt = (d: string) => new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));
  return {
    aktiv,
    board,
    eigene,
    info: {
      name: s.mitarbeiter.name,
      vorname: s.mitarbeiter.name.split(" ")[0],
      schicht: SCHICHT_LABEL[s.schicht],
      vorherSchicht: SCHICHT_LABEL[board.vorher.schicht],
      naechsteSchicht: SCHICHT_LABEL[NAECHSTE[s.schicht]],
      bereich: s.bereich,
      datum: fmt(s.datum),
    },
  };
}
