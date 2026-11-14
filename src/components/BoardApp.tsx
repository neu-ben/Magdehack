"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [dialog, setDialog] = useState(false);
  const [senden, setSenden] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const bestaetigt = eintraege.filter((e) => e.uebergabe?.status === "bestaetigt");
  const uebernommen = eintraege.filter((e) => e.uebergabe?.status === "uebernommen");
  const ohne = eintraege.filter((e) => !e.uebergabe || e.uebergabe.status === "entwurf");
  const kritisch = eintraege.flatMap((e) =>
    (e.uebergabe?.warnings ?? []).filter((w) => w.level === "rot").map((w) => ({ patient: e.patient, text: w.text })),
  );
  const alleUebernommen = eintraege.length > 0 && bestaetigt.length === 0 && uebernommen.length > 0;

  async function uebernehmen() {
    setSenden(true);
    setFehler(null);
    const res = await fetch("/api/uebernahme", { method: "POST" });
    setSenden(false);
    if (!res.ok) {
      setFehler((await res.json().catch(() => ({}))).error ?? "Übernahme fehlgeschlagen");
      return;
    }
    setDialog(false);
    router.refresh();
  }

  let stimmung: "freude" | "sorge" | "neutral" | "denkt" = "neutral";
  let text = `Hallo ${info.vorname}! Hier ist die Übergabe vom ${info.vorherSchicht}.`;
  if (alleUebernommen) {
    stimmung = "freude";
    text = `Du hast ${info.bereich} übernommen. Gute Schicht!`;
  } else if (bestaetigt.length === 0) {
    stimmung = "denkt";
    text = `Der ${info.vorherSchicht} hat noch keine Übergabe bestätigt.`;
  } else if (kritisch.length) {
    stimmung = "sorge";
    text = `${kritisch.length} kritische${kritisch.length === 1 ? "r Hinweis" : " Hinweise"} – lies die bitte zuerst.`;
  }

  return (
    <>
      <StatusLeiste
        name={info.name}
        offen={ohne.length}
        rot={kritisch.length}
        bestaetigt={uebernommen.length}
        titel={["Ohne bestätigte Übergabe", "Kritische Hinweise", "Übernommen"]}
      />
      <KopfBand titel={`Übernahme ${info.bereich}`} untertitel={`${info.vorherSchicht} → ${info.schicht} · ${info.datum}`} />

      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-5">
        <section className="flex items-end gap-2">
          <Otti stimmung={stimmung} groesse={104} className="shrink-0" />
          <p className="relative mb-6 flex-1 rounded-2xl border-2 border-linie bg-white px-4 py-3 text-[15px] font-bold leading-snug">
            {text}
            <span className="absolute -left-2 bottom-4 h-4 w-4 rotate-45 border-b-2 border-l-2 border-linie bg-white" />
          </p>
        </section>

        {!alleUebernommen && bestaetigt.length > 0 && (
          <button className="btn-primaer w-full !py-4 text-base" onClick={() => setDialog(true)}>
            <IconHaken /> {info.bereich} übernehmen
          </button>
        )}

        {eintraege.map((e) => (
          <BoardKarte key={e.patient.id} eintrag={e} vorherSchicht={info.vorherSchicht} />
        ))}
      </main>
      <TabLeiste />

      {/* Sicherheitsdialog vor der Übernahme */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinte/40 sm:items-center" role="dialog" aria-modal="true">
          <div className="anim-einblenden m-3 w-full max-w-[456px] rounded-3xl border-2 border-b-[6px] border-linie bg-white p-5">
            <div className="flex items-center gap-3">
              <Otti stimmung={kritisch.length ? "sorge" : "freude"} groesse={72} />
              <div>
                <p className="text-lg font-black leading-tight">
                  {kritisch.length === 0
                    ? `Keine kritischen Hinweise in ${info.bereich}`
                    : `${kritisch.length} kritische${kritisch.length === 1 ? "r Hinweis" : " Hinweise"} in ${info.bereich}`}
                </p>
                <p className="text-sm font-semibold text-grau">Bitte lesen, bevor du übernimmst.</p>
              </div>
            </div>

            {kritisch.length > 0 && (
              <ul className="mt-4 flex max-h-72 flex-col gap-2 overflow-y-auto">
                {kritisch.map((k, i) => (
                  <li key={i} className="flex gap-2 rounded-xl border-2 border-koralle bg-koralle-hell px-3 py-2 text-sm font-bold text-koralle-dunkel">
                    <IconWarnung className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      <span className="font-black">Zi. {k.patient.zimmer} · {k.patient.name}:</span> {k.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {ohne.length > 0 && (
              <p className="mt-3 rounded-xl bg-sonne-hell px-3 py-2 text-sm font-bold text-sonne-dunkel">
                Ohne bestätigte Übergabe: {ohne.map((e) => `Zi. ${e.patient.zimmer} ${e.patient.name}`).join(", ")}. Bitte direkt beim {info.vorherSchicht} nachfragen.
              </p>
            )}
            {fehler && <p className="mt-3 rounded-xl bg-koralle-hell px-3 py-2 text-sm font-bold text-koralle-dunkel">{fehler}</p>}

            <div className="mt-5 flex flex-col gap-2">
              <button className="btn-primaer w-full" onClick={uebernehmen} disabled={senden}>
                <IconHaken className="h-4 w-4" /> {senden ? "…" : "Gelesen, übernehmen"}
              </button>
              <button className="btn-weiss w-full" onClick={() => setDialog(false)} disabled={senden}>
                Zurück
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BoardKarte({ eintrag, vorherSchicht }: { eintrag: BoardEintrag; vorherSchicht: string }) {
  const [offen, setOffen] = useState(false);
  const { patient: p, uebergabe: u, verlauf } = eintrag;
  const status = !u ? "fehlt" : u.status;
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
              <li key={i} className="flex items-start gap-2 text-sm font-semibold">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-grau/50" />
                <span>
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
