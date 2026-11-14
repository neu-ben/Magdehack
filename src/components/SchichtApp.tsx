"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import type { BoardEintrag } from "@/lib/board";
import type { EigeneAufgabe, Notiz } from "@/lib/notizen";
import { faelligMinuten, jetztMinuten, uhrzeit } from "@/lib/zeit";
import { KopfBand, StatusLeiste, TabLeiste } from "./AppRahmen";
import { ZimmerBadge } from "./EntwurfKarte";
import { IconChat, IconHaken, IconMikro, IconWarnung } from "./Icons";
import { PatientChip } from "./Notizen";
import { Otti } from "./Otti";
import { SchichtPfad, type Stufe } from "./SchichtPfad";
import { UebernahmePopup } from "./UebernahmePopup";

type Info = { name: string; vorname: string; schicht: string; vorherSchicht: string; naechsteSchicht: string; bereich: string; datum: string };
type Patient = BoardEintrag["patient"];
type AufgabeZeile = { id: string; text: string; faellig: string | null; erledigt: boolean; patient: Patient | null; eigene: boolean };

// Uhr für "überfällig": jede halbe Minute neu; auf dem Server keine Markierung (kein Hydration-Mismatch)
const uhrAbo = (cb: () => void) => {
  const t = setInterval(cb, 30_000);
  return () => clearInterval(t);
};

export function SchichtApp({
  info,
  eintraege,
  aktiv,
  eigeneAufgaben,
  notizen,
}: {
  info: Info;
  eintraege: BoardEintrag[];
  aktiv: Stufe;
  eigeneAufgaben: EigeneAufgabe[];
  notizen: Notiz[];
}) {
  const router = useRouter();
  const uebernahmeOffen = aktiv === 0;
  const patienten = eintraege.map((e) => e.patient);
  const jetzt = useSyncExternalStore(uhrAbo, jetztMinuten, () => null);
  // Abgehakt-Stand lokal überschreiben, bis der Server ihn bestätigt hat
  const [abgehakt, setAbgehakt] = useState<Record<string, boolean>>({});
  const aufgaben: AufgabeZeile[] = [
    ...eintraege.flatMap((e) =>
      (e.uebergabe?.tasks ?? [])
        .filter((t) => t.id)
        .map((t) => ({ id: t.id!, text: t.text, faellig: t.faellig, erledigt: !!t.erledigt, patient: e.patient, eigene: false })),
    ),
    ...eigeneAufgaben.map((t) => ({ ...t, patient: patienten.find((p) => p.id === t.patient_id) ?? null, eigene: true })),
  ].map((a) => (a.id in abgehakt ? { ...a, erledigt: abgehakt[a.id] } : a));
  const ueberfaellig = (a: AufgabeZeile) => {
    const m = faelligMinuten(a.faellig);
    return !a.erledigt && jetzt != null && m != null && m < jetzt;
  };
  const [dialog, setDialog] = useState(false);

  const kritisch = eintraege.flatMap((e) =>
    (e.uebergabe?.warnings ?? []).filter((w) => w.level === "rot").map((w) => ({ patient: e.patient, text: w.text })),
  );
  const offen = aufgaben.filter((a) => !a.erledigt);
  // Alle Aufgaben abgehakt -> "Versorgen" ist erledigt, "Übergabe" wird aktiv und anklickbar
  const versorgt = aktiv === 1 && aufgaben.length > 0 && offen.length === 0;
  const pfadAktiv: Stufe = versorgt ? 2 : aktiv;
  const pfadLinks: Partial<Record<number, string>> = {};
  if (aktiv >= 1 && aktiv < 3) pfadLinks[1] = "#aufgaben"; // Versorgen -> Aufgabenliste
  if (pfadAktiv === 2) pfadLinks[2] = "/schicht/uebergabe";

  async function abhaken(id: string, erledigt: boolean) {
    setAbgehakt((m) => ({ ...m, [id]: erledigt }));
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ erledigt }),
    });
    if (!res.ok) setAbgehakt((m) => ({ ...m, [id]: !erledigt }));
  }

  function zurUebergabe() {
    if (offen.length && aktiv < 2) setDialog(true);
    else router.push("/schicht/uebergabe");
  }

  // Aufgaben nach Patient gruppieren (Reihenfolge wie Board: Kritisches zuerst), Flur-Aufgaben am Ende
  const gruppen = [...patienten, null]
    .map((p) => ({ patient: p, aufgaben: aufgaben.filter((a) => (a.patient?.id ?? null) === (p?.id ?? null)) }))
    .filter((g) => g.aufgaben.length);

  let sprechblase = `Los geht's, ${info.vorname}! Hak ab, was du erledigt hast. Am Ende sprichst du mir die Übergabe ein.`;
  if (aktiv === 2) sprechblase = "Deine Übergabe ist angefangen. Prüf und bestätige die Entwürfe.";
  if (aktiv >= 3) sprechblase = `Übergabe fertig. ${info.naechsteSchicht} kann übernehmen. Schönen Feierabend!`;
  if (versorgt) sprechblase = "Alle Aufgaben erledigt – stark! Tipp auf „Übergabe“, wenn du so weit bist.";

  return (
    <>
      <StatusLeiste name={info.name} />
      <KopfBand titel={`${info.schicht} · ${info.bereich}`} untertitel={`${info.datum} · übernommen vom ${info.vorherSchicht}`} />

      <main className="flex flex-1 flex-col gap-5 px-4 pb-6 pt-4">
        <SchichtPfad aktiv={pfadAktiv} links={pfadLinks} stimmung={aktiv >= 3 || versorgt ? "freude" : kritisch.length ? "sorge" : "neutral"} />

        <p className="rounded-2xl border-2 border-linie bg-white px-4 py-3 text-center text-[15px] font-bold leading-snug">{sprechblase}</p>

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
        <section id="aufgaben" className="scroll-mt-16">
          <Titel>
            Aufgaben · {aufgaben.length - offen.length}/{aufgaben.length}
          </Titel>
          {gruppen.length === 0 && <p className="text-sm font-semibold text-grau">Keine Aufgaben. Eigene legst du über Otti an.</p>}
          <div className="flex flex-col gap-3">
            {gruppen.map((g) => (
              <article key={g.patient?.id ?? "flur"} className="karte px-3 py-3">
                <header className="mb-2 flex items-center gap-2">
                  {g.patient ? <ZimmerBadge zimmer={g.patient.zimmer} /> : null}
                  <p className="font-extrabold">{g.patient ? g.patient.name : "Ganzer Flur"}</p>
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
                          {a.faellig && (
                            <span className={`ml-1 text-xs font-extrabold ${ueberfaellig(a) ? "text-koralle-dunkel" : "text-tuerkis"}`}>· {a.faellig}</span>
                          )}
                          {ueberfaellig(a) && (
                            <span className="ml-1.5 rounded-md bg-koralle px-1.5 py-0.5 align-middle text-[10px] font-extrabold uppercase tracking-wide text-white">
                              überfällig
                            </span>
                          )}
                          {a.eigene && (
                            <span className="ml-1.5 rounded-md bg-himmel-hell px-1.5 py-0.5 align-middle text-[10px] font-extrabold uppercase tracking-wide text-himmel">
                              eigene
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* Hauptaktion: erst abhaken, dann Schicht beenden */}
        {aktiv < 3 && (
          <button className="btn-koralle w-full !py-4 text-base" onClick={zurUebergabe}>
            <IconMikro className="h-5 w-5" /> {aktiv === 2 ? "Weiter zur Übergabe" : "Schicht beenden & Übergabe einsprechen"}
          </button>
        )}

        {/* Notizen für Otti */}
        <section>
          <Titel>Notizen für die Übergabe · {notizen.length}</Titel>
          {notizen.length > 0 && (
            <ul className="mb-2 flex flex-col gap-1.5">
              {notizen.slice(-3).map((n) => (
                <li key={n.id} className="rounded-xl bg-flaeche px-3 py-2 text-sm font-semibold">
                  <span className="mr-1.5 text-xs font-extrabold text-tuerkis">{uhrzeit(n.created_at)}</span>
                  <PatientChip patientId={n.patient_id} patienten={patienten} />
                  <span className="mt-0.5 block">{n.text}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/otti" className="flex items-center gap-3 rounded-2xl border-2 border-b-4 border-linie bg-white px-4 py-3 hover:bg-tuerkis-hell">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-tuerkis-hell text-tuerkis">
              <IconChat className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-extrabold">{aktiv >= 3 ? "Otti fragen" : "Notiz für Otti"}</span>
              <span className="block text-xs font-semibold text-grau">
                {aktiv >= 3
                  ? "Fragen zu deinen Patienten stellen."
                  : notizen.length > 3
                  ? `Alle ${notizen.length} Notizen ansehen, neue einsprechen oder Otti etwas fragen.`
                  : "Kurz einsprechen, was dir auffällt. Otti baut es in die Übergabe ein."}
              </span>
            </span>
          </Link>
        </section>
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
                  <span className="font-black">{a.patient ? `Zi. ${a.patient.zimmer}` : "Flur"}:</span> {a.text}
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
