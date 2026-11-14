"use client";

import { useState } from "react";
import type { BoardEintrag } from "@/lib/board";
import type { Highlight } from "@/lib/types";
import { KopfBand, StatusLeiste, TabLeiste } from "./AppRahmen";
import { ZimmerBadge } from "./EntwurfKarte";
import { IconHaken, IconWarnung } from "./Icons";
import { Otti } from "./Otti";
import { Verlauf } from "./Verlauf";

type Info = { name: string; vorname: string; schicht: string; vorherSchicht: string; bereich: string; datum: string };

const HL_STIL: Record<Highlight["level"], string> = {
  kritisch: "bg-koralle-hell text-koralle-dunkel",
  beachten: "bg-sonne-hell text-sonne-dunkel",
  info: "bg-himmel-hell text-himmel",
};

export function BoardApp({ info, eintraege }: { info: Info; eintraege: BoardEintrag[] }) {
  // Nur noch Nachschlage-Ansicht: Übernommen wird im Popup direkt nach dem Login.
  const bestaetigt = eintraege.filter((e) => e.uebergabe?.status === "bestaetigt");
  const uebernommen = eintraege.filter((e) => e.uebergabe?.status === "uebernommen");
  const kritisch = eintraege.flatMap((e) =>
    (e.uebergabe?.warnings ?? []).filter((w) => w.level === "rot").map((w) => ({ patient: e.patient, text: w.text })),
  );

  let stimmung: "freude" | "sorge" | "neutral" | "denkt" = "neutral";
  let text = `Hier kannst du die Übergabe vom ${info.vorherSchicht} jederzeit nachlesen.`;
  if (bestaetigt.length > 0) {
    stimmung = "denkt";
    text = `Noch nicht übernommen. Das machst du direkt beim Start in der Übergabe.`;
  } else if (uebergabenLeer(eintraege)) {
    stimmung = "denkt";
    text = `Der ${info.vorherSchicht} hat noch keine Übergabe bestätigt.`;
  } else if (kritisch.length) {
    stimmung = "sorge";
    text = `Denk an ${kritisch.length === 1 ? "den kritischen Hinweis" : `die ${kritisch.length} kritischen Hinweise`}.`;
  } else if (uebernommen.length) {
    stimmung = "freude";
  }

  return (
    <>
      <StatusLeiste name={info.name} />
      <KopfBand titel={`Übergabe ${info.vorherSchicht} · ${info.bereich}`} untertitel={`zum Nachschlagen · ${info.datum}`} />

      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-5">
        <section className="flex items-end gap-2">
          <Otti stimmung={stimmung} groesse={104} className="shrink-0" />
          <p className="relative mb-6 flex-1 rounded-2xl border-2 border-linie bg-white px-4 py-3 text-[15px] font-bold leading-snug">
            {text}
            <span className="absolute -left-2 bottom-4 h-4 w-4 rotate-45 border-b-2 border-l-2 border-linie bg-white" />
          </p>
        </section>

        {eintraege.map((e) => (
          <BoardKarte key={e.patient.id} eintrag={e} vorherSchicht={info.vorherSchicht} />
        ))}
      </main>
      <TabLeiste />
    </>
  );
}

function uebergabenLeer(eintraege: BoardEintrag[]) {
  return !eintraege.some((e) => e.uebergabe && e.uebergabe.status !== "entwurf");
}

function BoardKarte({ eintrag, vorherSchicht }: { eintrag: BoardEintrag; vorherSchicht: string }) {
  const [offen, setOffen] = useState(false);
  const { patient: p, uebergabe: u, verlauf } = eintrag;
  const status = !u ? (eintrag.neuaufnahme ? "neu" : "fehlt") : u.status;
  const rot = (u?.warnings ?? []).some((w) => w.level === "rot");

  return (
    <article className={`karte overflow-hidden ${rot ? "border-koralle/60" : ""}`}>
      <header className="flex items-start gap-3 px-4 pt-3">
        <ZimmerBadge zimmer={p.zimmer} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black leading-tight">{p.name}</p>
          <p className="truncate text-xs font-bold text-grau">
            {p.alter} J. · {p.diagnose}
          </p>
        </div>
        {status === "uebernommen" && <Chip stil="bg-tuerkis-hell text-tuerkis">Übernommen</Chip>}
        {status === "bestaetigt" && <Chip stil="bg-himmel-hell text-himmel">Bestätigt</Chip>}
        {(status === "entwurf" || status === "fehlt") && <Chip stil="bg-sonne-hell text-sonne-dunkel">Fehlt</Chip>}
        {status === "neu" && <Chip stil="bg-himmel-hell text-himmel">Neuaufnahme</Chip>}
      </header>

      <div className="flex flex-col gap-3 px-4 py-3">
        {(status === "entwurf" || status === "fehlt") && (
          <p className="rounded-xl bg-sonne-hell px-3 py-2 text-sm font-bold text-sonne-dunkel">
            {status === "entwurf" ? `Entwurf vom ${vorherSchicht} ist noch nicht bestätigt.` : `Keine Übergabe vom ${vorherSchicht}.`}
          </p>
        )}

        {(u?.warnings ?? []).map((w, i) => (
          <p
            key={i}
            className={`flex gap-2 rounded-xl border-2 px-3 py-2 text-sm font-bold ${
              w.level === "rot" ? "border-koralle bg-koralle-hell text-koralle-dunkel" : "border-sonne bg-sonne-hell text-sonne-dunkel"
            }`}
          >
            <IconWarnung className="mt-0.5 h-4 w-4 shrink-0" />
            {w.text}
          </p>
        ))}

        {u && u.status !== "entwurf" && (u.highlights ?? []).length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {u.highlights.map((h, i) => (
              <li key={i} className={`rounded-lg px-2 py-1 text-xs font-extrabold ${HL_STIL[h.level]}`}>
                {h.text}
              </li>
            ))}
          </ul>
        )}

        {(verlauf.blutdruck || verlauf.puls) && (
          <div className="flex flex-col gap-1 rounded-2xl bg-flaeche px-3 py-2">
            {verlauf.blutdruck && <Verlauf typ="blutdruck" punkte={verlauf.blutdruck} />}
            {verlauf.puls && <Verlauf typ="puls" punkte={verlauf.puls} />}
          </div>
        )}

        {u && u.status !== "entwurf" && (u.tasks ?? []).length > 0 && (
          <ul className="flex flex-col gap-1">
            {u.tasks.map((t, i) => (
              <li key={t.id ?? i} className="flex items-start gap-2 text-sm font-semibold">
                {/* Abgehakt in "Meine Schicht" -> hier als erledigt */}
                <span
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border-2 ${
                    t.erledigt ? "border-tuerkis-dunkel bg-tuerkis text-white" : "border-grau/50"
                  }`}
                  aria-label={t.erledigt ? "erledigt" : "offen"}
                >
                  {t.erledigt && <IconHaken className="h-3 w-3" />}
                </span>
                <span className={t.erledigt ? "text-grau line-through" : ""}>
                  {t.text}
                  {t.faellig && <span className="ml-1 text-xs font-extrabold text-tuerkis">· {t.faellig}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}

        {u && u.status !== "entwurf" && (
          <>
            <button onClick={() => setOffen((o) => !o)} className="self-start text-xs font-extrabold text-tuerkis">
              {offen ? "Weniger" : "Ganze Übergabe (SBAR) anzeigen"}
            </button>
            {offen && (
              <dl className="flex flex-col gap-2 text-sm font-semibold leading-snug">
                {(
                  [
                    ["S", u.situation],
                    ["B", u.background],
                    ["A", u.assessment],
                    ["R", u.recommendation],
                  ] as const
                ).map(([b, t]) => (
                  <div key={b} className="flex gap-2">
                    <dt className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-tuerkis-hell text-xs font-black text-tuerkis">{b}</dt>
                    <dd>{t}</dd>
                  </div>
                ))}
              </dl>
            )}
          </>
        )}
      </div>
    </article>
  );
}

function Chip({ stil, children }: { stil: string; children: React.ReactNode }) {
  return <span className={`rounded-lg px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider ${stil}`}>{children}</span>;
}
