"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BoardEintrag } from "@/lib/board";
import { KopfBand, StatusLeiste, TabLeiste } from "./AppRahmen";
import { ZimmerBadge } from "./EntwurfKarte";
import { IconHaken, IconMikro, IconWarnung } from "./Icons";
import { Otti } from "./Otti";
import { SchichtPfad, type Stufe } from "./SchichtPfad";
import { UebernahmePopup } from "./UebernahmePopup";

type Info = { name: string; vorname: string; schicht: string; vorherSchicht: string; naechsteSchicht: string; bereich: string; datum: string };
type AufgabeZeile = { id: string; text: string; faellig: string | null; erledigt: boolean; patient: BoardEintrag["patient"] };

export function SchichtApp({ info, eintraege, aktiv }: { info: Info; eintraege: BoardEintrag[]; aktiv: Stufe }) {
  const router = useRouter();
  const uebernahmeOffen = aktiv === 0;
  const [aufgaben, setAufgaben] = useState<AufgabeZeile[]>(() =>
    eintraege.flatMap((e) =>
      (e.uebergabe?.tasks ?? [])
        .filter((t) => t.id)
        .map((t) => ({ id: t.id!, text: t.text, faellig: t.faellig, erledigt: !!t.erledigt, patient: e.patient })),
    ),
  );
  const [dialog, setDialog] = useState(false);

  const kritisch = eintraege.flatMap((e) =>
    (e.uebergabe?.warnings ?? []).filter((w) => w.level === "rot").map((w) => ({ patient: e.patient, text: w.text })),
  );
  const offen = aufgaben.filter((a) => !a.erledigt);

  async function abhaken(id: string, erledigt: boolean) {
    setAufgaben((as) => as.map((a) => (a.id === id ? { ...a, erledigt } : a)));
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ erledigt }),
    });
    if (!res.ok) setAufgaben((as) => as.map((a) => (a.id === id ? { ...a, erledigt: !erledigt } : a)));
  }

  function zurUebergabe() {
    if (offen.length && aktiv < 2) setDialog(true);
    else router.push("/schicht/uebergabe");
  }

  // Aufgaben nach Patient gruppieren (Reihenfolge wie Board: Kritisches zuerst)
  const gruppen = eintraege
    .map((e) => ({ patient: e.patient, aufgaben: aufgaben.filter((a) => a.patient.id === e.patient.id) }))
    .filter((g) => g.aufgaben.length);

  let sprechblase = `Los geht's, ${info.vorname}! Hak ab, was du erledigt hast. Am Ende sprichst du mir die Übergabe ein.`;
  if (aktiv === 2) sprechblase = "Deine Übergabe ist angefangen. Prüf und bestätige die Entwürfe.";
  if (aktiv >= 3) sprechblase = `Übergabe fertig. ${info.naechsteSchicht} kann übernehmen. Schönen Feierabend!`;
  if (aktiv === 1 && offen.length === 0 && aufgaben.length) sprechblase = "Alle Aufgaben erledigt – stark! Bereit für die Übergabe?";

  return (
    <>
      <StatusLeiste
        name={info.name}
        offen={offen.length}
        rot={kritisch.length}
        bestaetigt={aufgaben.length - offen.length}
        titel={["Offene Aufgaben", "Kritische Hinweise", "Erledigt"]}
      />
      <KopfBand titel={`${info.schicht} · ${info.bereich}`} untertitel={`${info.datum} · übernommen vom ${info.vorherSchicht}`} />

      <main className="flex flex-1 flex-col gap-5 px-4 pb-6 pt-4">
        <SchichtPfad aktiv={aktiv} stimmung={aktiv >= 3 ? "freude" : kritisch.length ? "sorge" : "neutral"} />

        <p className="rounded-2xl border-2 border-linie bg-white px-4 py-3 text-center text-[15px] font-bold leading-snug">{sprechblase}</p>

        {/* Hauptaktion */}
        {aktiv < 3 && (
          <button className="btn-koralle w-full !py-4 text-base" onClick={zurUebergabe}>
            <IconMikro className="h-5 w-5" /> {aktiv === 2 ? "Weiter zur Übergabe" : "Schicht beenden & Übergabe einsprechen"}
          </button>
        )}

        {/* Angepinnte kritische Hinweise */}
        {kritisch.length > 0 && (
          <section>
            <Titel>Im Blick behalten</Titel>
            <ul className="flex flex-col gap-2">
              {kritisch.map((k, i) => (
                <li key={i} className="flex gap-2 rounded-xl border-2 border-koralle bg-koralle-hell px-3 py-2 text-sm font-bold text-koralle-dunkel">
                  <IconWarnung className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <span className="font-black">Zi. {k.patient.zimmer}:</span> {k.text}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Aufgaben aus der Übernahme */}
        <section>
          <Titel>
            Aufgaben aus der Übernahme · {aufgaben.length - offen.length}/{aufgaben.length}
          </Titel>
          {gruppen.length === 0 && <p className="text-sm font-semibold text-grau">Keine Aufgaben übernommen.</p>}
          <div className="flex flex-col gap-3">
            {gruppen.map((g) => (
              <article key={g.patient.id} className="karte px-3 py-3">
                <header className="mb-2 flex items-center gap-2">
                  <ZimmerBadge zimmer={g.patient.zimmer} />
                  <p className="font-extrabold">{g.patient.name}</p>
                </header>
                <ul className="flex flex-col gap-1.5">
                  {g.aufgaben.map((a) => (
                    <li key={a.id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-1.5 hover:bg-flaeche">
                        <input type="checkbox" className="peer sr-only" checked={a.erledigt} onChange={(e) => abhaken(a.id, e.target.checked)} />
                        <span
                          className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 border-b-4 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-tuerkis ${
                            a.erledigt ? "border-tuerkis-dunkel bg-tuerkis text-white" : "border-linie bg-white"
                          }`}
                        >
                          {a.erledigt && <IconHaken className="h-4 w-4" />}
                        </span>
                        <span className={`text-sm font-semibold ${a.erledigt ? "text-grau line-through" : ""}`}>
                          {a.text}
                          {a.faellig && <span className="ml-1 text-xs font-extrabold text-tuerkis">· {a.faellig}</span>}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* Vorschau: Notizen während der Schicht */}
        <button
          className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-linie px-4 py-3 text-left"
          disabled
          title="Kommt bald: Notizen während der Schicht, die Otti in die Übergabe einbaut"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-tuerkis-hell text-tuerkis">
            <IconMikro className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-extrabold">Notiz für Otti</span>
            <span className="block text-xs font-semibold text-grau">Kurz einsprechen, was dir auffällt. Otti baut es in die Übergabe ein.</span>
          </span>
          <span className="rounded-lg bg-sonne-hell px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-sonne-dunkel">bald</span>
        </button>
      </main>
      <TabLeiste />

      {uebernahmeOffen && (
        <UebernahmePopup
          vorname={info.vorname}
          vorherSchicht={info.vorherSchicht}
          bereich={info.bereich}
          eintraege={eintraege}
          onUebernommen={() => router.refresh()}
        />
      )}

      {/* Bestätigung: offene Aufgaben vor der Übergabe */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinte/45" role="dialog" aria-modal="true">
          <div className="anim-einblenden m-3 w-full max-w-[456px] rounded-3xl border-2 border-b-[6px] border-linie bg-white p-5">
            <div className="flex items-center gap-3">
              <Otti stimmung="denkt" groesse={72} />
              <p className="text-lg font-black leading-tight">
                {offen.length} Aufgabe{offen.length === 1 ? " ist" : "n sind"} noch offen
              </p>
            </div>
            <ul className="mt-3 flex max-h-56 flex-col gap-1 overflow-y-auto">
              {offen.map((a) => (
                <li key={a.id} className="rounded-xl bg-flaeche px-3 py-2 text-sm font-semibold">
                  <span className="font-black">Zi. {a.patient.zimmer}:</span> {a.text}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm font-semibold text-grau">Otti erinnert in der Übergabe an alles, was offen bleibt.</p>
            <div className="mt-4 flex flex-col gap-2">
              <button className="btn-primaer w-full" onClick={() => router.push("/schicht/uebergabe")}>
                Trotzdem zur Übergabe
              </button>
              <button className="btn-weiss w-full" onClick={() => setDialog(false)}>
                Zurück
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Titel({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-grau">{children}</h2>;
}
