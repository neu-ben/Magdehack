"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent } from "@/lib/agent";
import { DEMO_TEXT } from "@/lib/demo-text";
import type { Notiz } from "@/lib/notizen";
import type { Entwurf, Patient } from "@/lib/types";
import { useSpeech } from "@/lib/useSpeech";
import { KopfBand, StatusLeiste, TabLeiste } from "./AppRahmen";
import { EntwurfKarte } from "./EntwurfKarte";
import { IconMikro, IconStopp, IconWarnung } from "./Icons";
import { Otti, type OttiStimmung } from "./Otti";
import { SchichtPfad } from "./SchichtPfad";
import { abschnitteProPatient, erwaehntePatienten, fehlendePflichtwerte, FlurUebersicht, flurStatus } from "./FlurUebersicht";
import { NotizListe } from "./Notizen";
import { HelferOtter, type InArbeit } from "./HelferOtter";
import { abmelden } from "@/app/actions";
import Link from "next/link";

type SitzungInfo = { name: string; vorname: string; schicht: string; naechsteSchicht: string; bereich: string; datum: string };
type NichtZugeordnet = { id: number; text: string; grund: string; vermutung?: string };

export function AufnahmeApp({
  sitzung,
  patienten,
  initial,
  notizen,
}: {
  sitzung: SitzungInfo;
  patienten: Patient[];
  initial: Entwurf[];
  notizen: Notiz[];
}) {
  const sp = useSpeech();
  const [uebergaben, setUebergaben] = useState<Entwurf[]>(initial);
  const [schritte, setSchritte] = useState<string[]>([]);
  const [offeneZuordnung, setOffeneZuordnung] = useState<NichtZugeordnet[]>([]);
  const [agentLaeuft, setAgentLaeuft] = useState(false);
  // Wartenanzeige: welche Patienten gerade ausgewertet werden, und seit wann der Agent läuft
  const [inArbeit, setInArbeit] = useState<InArbeit[]>([]);
  const [seit, setSeit] = useState(0);
  const warteRef = useRef<HTMLDivElement>(null);
  // Beim Start die Wartenanzeige ins Bild holen, damit man den Helfer-Ottern zusehen kann
  useEffect(() => {
    if (agentLaeuft) warteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [agentLaeuft]);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = useCallback(async () => {
    const res = await fetch("/api/drafts", { cache: "no-store" });
    if (res.ok) setUebergaben((await res.json()).uebergaben);
  }, []);

  const runAgent = useCallback(
    async (transkript: string, patientId?: string) => {
      setAgentLaeuft(true);
      setInArbeit([]);
      setSeit(Date.now());
      setFehler(null);
      setSchritte([]);
      if (!patientId) setOffeneZuordnung([]);
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transkript, patientId }),
        });
        if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? "Agent nicht erreichbar");
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let puffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          puffer += value;
          const zeilen = puffer.split("\n");
          puffer = zeilen.pop() ?? "";
          for (const z of zeilen) {
            if (!z.trim()) continue;
            const e = JSON.parse(z) as AgentEvent;
            if (e.type === "step") setSchritte((s) => [...s, e.text]);
            if (e.type === "arbeitet") setInArbeit((l) => [...l.filter((x) => x.id !== e.patient.id), e.patient]);
            // Platzhalter erst entfernen, wenn die echte Karte geladen ist
            if (e.type === "draft") void laden().then(() => setInArbeit((l) => l.filter((x) => x.id !== e.patient.id)));
            if (e.type === "unassigned")
              setOffeneZuordnung((u) => [...u, { id: Date.now() + Math.random(), text: e.text, grund: e.grund, vermutung: e.vermutung }]);
            if (e.type === "error") setFehler(e.message);
          }
        }
      } catch (err) {
        setFehler(err instanceof Error ? err.message : "Unbekannter Fehler");
      } finally {
        setAgentLaeuft(false);
        setInArbeit([]);
        await laden();
      }
    },
    [laden],
  );

  // Im Feld ungekürzt anzeigen (sonst verschwindet jedes Leerzeichen am Ende), gekürzt prüfen und senden
  const feldText = sp.text + (sp.zwischen ? " " + sp.zwischen : "");
  const transkript = feldText.trim();
  // Kritisches zuerst: rote Warnungen, dann gelbe, dann nach Zimmer
  const dringlichkeit = (u: Entwurf) =>
    (u.warnings ?? []).reduce((n, w) => n + (w.level === "rot" ? 100 : 1), 0);
  const entwuerfe = uebergaben.filter((u) => u.status === "entwurf").sort((a, b) => dringlichkeit(b) - dringlichkeit(a));
  const bestaetigt = uebergaben.filter((u) => u.status !== "entwurf");
  const rot = entwuerfe.reduce((n, u) => n + (u.warnings ?? []).filter((w) => w.level === "rot").length, 0);
  // Patienten mit Notizen, aber ohne Übergabe: Otti erinnert, bevor die Übergabe als fertig gilt
  const notizZahl = new Map<string, number>();
  for (const n of notizen) if (n.patient_id) notizZahl.set(n.patient_id, (notizZahl.get(n.patient_id) ?? 0) + 1);
  const nurNotiz = patienten.filter((p) => notizZahl.has(p.id) && !uebergaben.some((u) => u.patient.id === p.id));
  const alleFertig = uebergaben.length > 0 && entwuerfe.length === 0 && offeneZuordnung.length === 0 && nurNotiz.length === 0;

  // Flur-Übersicht: wer ist schon besprochen?
  const status = flurStatus(patienten, uebergaben, erwaehntePatienten(transkript, patienten));
  const fehlend = patienten
    .filter((p) => status.get(p.id) === "offen")
    .sort((a, b) => a.zimmer.localeCompare(b.zimmer, "de", { numeric: true }));

  // Pflichtwerte live: für alle Patienten, die noch keinen Entwurf haben
  const abschnitte = abschnitteProPatient(transkript, patienten);
  const ohneEntwurf = patienten
    .filter((p) => !uebergaben.some((u) => u.patient.id === p.id))
    .sort((a, b) => a.zimmer.localeCompare(b.zimmer, "de", { numeric: true }));
  const pflichtLuecken = ohneEntwurf
    .filter((p) => abschnitte.has(p.id))
    .map((p) => ({ p, fehlt: fehlendePflichtwerte(abschnitte.get(p.id)) }))
    .filter((x) => x.fehlt.length);

  // Abschluss-Ansicht: nach dem letzten Bestätigen nach oben scrollen
  useEffect(() => {
    if (alleFertig) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [alleFertig]);

  // Was Otti gerade sagt
  let stimmung: OttiStimmung = "neutral";
  let sprechblase = `Hallo ${sitzung.vorname}! Erzähl mir, wie die Schicht war. Nenn vor jedem Patienten den Namen oder das Zimmer.`;
  if (sp.aktiv) {
    stimmung = "hoert";
    sprechblase = "Ich höre zu …";
  } else if (agentLaeuft) {
    stimmung = "denkt";
    sprechblase = "Ich sortiere nach Patienten und schaue mir den Verlauf an …";
  } else if (alleFertig) {
    stimmung = "freude";
    sprechblase = `Alles bestätigt! ${sitzung.naechsteSchicht} kann übernehmen.`;
  } else if (entwuerfe.length) {
    stimmung = rot ? "sorge" : "freude";
    sprechblase = rot
      ? `${entwuerfe.length} Entwürfe sind fertig. Bei ${rot === 1 ? "einem Patienten" : `${rot} Hinweisen`} bin ich unruhig – schau bitte genau hin.`
      : `${entwuerfe.length} Entwürfe sind fertig. Bitte prüfen und bestätigen.`;
  } else if (uebergaben.length > 0 && nurNotiz.length) {
    stimmung = "sorge";
    const namen = nurNotiz.map((p) => `${p.name.split(" ").at(-1)} (Zi. ${p.zimmer})`).join(" und ");
    sprechblase = `Für ${namen} hast du Notizen, aber noch keine Übergabe. Sprich sie bitte noch kurz ein.`;
  } else if (transkript && fehlend.length) {
    stimmung = "denkt";
    const namen = fehlend
      .map((p) => `Zimmer ${p.zimmer} (${p.name.split(" ").at(-1)}${notizZahl.has(p.id) ? ", mit Notizen" : ""})`)
      .join(", ");
    sprechblase = `${namen} ${fehlend.length === 1 ? "fehlt" : "fehlen"} noch – absichtlich? Sonst gib mir die Übergabe!`;
  } else if (transkript && pflichtLuecken.length) {
    stimmung = "denkt";
    sprechblase =
      "Mir fehlt noch: " +
      pflichtLuecken.map((x) => `${x.fehlt.map((v) => v.label).join(", ")} bei ${x.p.name.split(" ").at(-1)}`).join("; ") +
      ". Sag es noch dazu – oder gib mir die Übergabe, dann markierst du es danach.";
  } else if (transkript) {
    sprechblase = "Alle Patienten erwähnt, alle Pflichtwerte genannt. Gib mir die Übergabe!";
  }

  return (
    <>
      <StatusLeiste name={sitzung.name} />
      <KopfBand titel={`${sitzung.schicht} → ${sitzung.naechsteSchicht}`} untertitel={`${sitzung.bereich} · ${sitzung.datum} · ${patienten.length} Patienten`} />

      <main className="flex flex-1 flex-col gap-5 px-4 pb-6 pt-4">
        <div>
          <SchichtPfad aktiv={alleFertig ? 3 : 2} variante="klein" />
          <Link href="/schicht" className="mt-2 inline-block text-xs font-extrabold text-grau underline hover:text-tinte">
            ← Zurück zu meiner Schicht
          </Link>
        </div>

        {alleFertig ? (
          <section className="anim-einblenden flex flex-col items-center gap-3 rounded-3xl bg-tuerkis-hell px-5 py-6 text-center">
            <Otti stimmung="freude" groesse={150} wippen />
            <h2 className="text-2xl font-black text-tuerkis-dunkel">Übergabe fertig!</h2>
            <p className="font-bold">
              {uebergaben.length} Patienten bestätigt. {sitzung.naechsteSchicht} kann übernehmen.
              <br />
              Schönen Feierabend, {sitzung.vorname}!
            </p>
            <form action={abmelden} className="w-full">
              <button className="btn-primaer mt-2 w-full">Abmelden</button>
            </form>
          </section>
        ) : (
        <>
        {/* Otti mit Sprechblase */}
        <section className="flex items-end gap-2">
          <Otti stimmung={stimmung} groesse={112} wippen={agentLaeuft || sp.aktiv} className="shrink-0" />
          <p className="relative mb-6 flex-1 rounded-2xl border-2 border-linie bg-white px-4 py-3 text-[15px] font-bold leading-snug">
            {sprechblase}
            <span className="absolute -left-2 bottom-4 h-4 w-4 rotate-45 border-b-2 border-l-2 border-linie bg-white" />
          </p>
        </section>

        <FlurUebersicht bereich={sitzung.bereich} patienten={patienten} status={status} notizen={notizZahl} abschnitte={abschnitte} />

        {notizen.length > 0 && (
          <details className="karte px-4 py-3">
            <summary className="cursor-pointer text-sm font-extrabold text-tuerkis-dunkel">
              Deine Notizen ({notizen.length}) · Otti baut sie ein, du musst sie nicht wiederholen
            </summary>
            <div className="mt-3">
              <NotizListe notizen={notizen} patienten={patienten} />
            </div>
          </details>
        )}

        <div ref={warteRef} className="scroll-mt-20 empty:hidden">
          {agentLaeuft && <HelferOtter patienten={patienten} inArbeit={inArbeit} seit={seit} />}
        </div>

        {/* Aufnahme */}
        <section className="flex flex-col items-center gap-3">
          <button
            onClick={sp.aktiv ? sp.stop : sp.start}
            disabled={agentLaeuft || !sp.unterstuetzt}
            className={`relative grid h-24 w-24 place-items-center rounded-full border-b-[6px] text-white transition-transform active:translate-y-1 active:border-b-2 disabled:opacity-40 ${
              sp.aktiv ? "puls-ring border-koralle-dunkel bg-koralle" : "border-tuerkis-dunkel bg-tuerkis"
            }`}
            aria-label={sp.aktiv ? "Aufnahme stoppen" : "Aufnahme starten"}
          >
            <span className="relative">{sp.aktiv ? <IconStopp className="h-10 w-10" /> : <IconMikro className="h-11 w-11" />}</span>
          </button>
          <p className="text-xs font-extrabold uppercase tracking-widest text-grau">
            {!sp.unterstuetzt ? "Spracheingabe nur in Chrome – bitte tippen" : sp.aktiv ? "Aufnahme läuft" : "Tippen zum Sprechen"}
          </p>
          {sp.fehler && <p className="text-sm font-bold text-koralle-dunkel">{sp.fehler}</p>}
        </section>

        <section className="karte p-3">
          <textarea
            className="feld min-h-28 resize-y !border-0 !bg-transparent !px-1 text-[15px]"
            placeholder="Hier erscheint das Transkript. Du kannst auch tippen."
            value={feldText}
            onChange={(e) => sp.setText(e.target.value)}
            disabled={sp.aktiv}
          />
          <div className="mt-2 flex items-center gap-2">
            <button className="text-xs font-extrabold text-grau underline hover:text-tinte" onClick={() => sp.setText(DEMO_TEXT)} disabled={sp.aktiv || agentLaeuft}>
              Beispieltext
            </button>
            {transkript && !sp.aktiv && (
              <button className="text-xs font-extrabold text-grau underline hover:text-tinte" onClick={() => sp.setText("")} disabled={agentLaeuft}>
                Leeren
              </button>
            )}
            <button className="btn-primaer ml-auto" onClick={() => runAgent(transkript)} disabled={!transkript || sp.aktiv || agentLaeuft}>
              {agentLaeuft ? "Otti arbeitet …" : "An Otti geben"}
            </button>
          </div>
        </section>

        </>
        )}

        {/* Agent-Schritte live */}
        {schritte.length > 0 && !agentLaeuft && (
          <details className="rounded-2xl bg-tuerkis-hell px-4 py-3">
            <summary className="cursor-pointer text-sm font-extrabold text-tuerkis-dunkel">
              Otti hat {schritte.length} Schritte erledigt
            </summary>
            <ol className="mt-2 flex flex-col gap-1">
              {schritte.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm font-bold text-tuerkis-dunkel">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-tuerkis" />
                  {s}
                </li>
              ))}
            </ol>
          </details>
        )}

        {fehler && <p className="rounded-2xl bg-koralle-hell px-4 py-3 text-sm font-bold text-koralle-dunkel">{fehler}</p>}

        {/* Nicht zugeordnet */}
        {offeneZuordnung.map((u) => (
          <ZuordnungKarte
            key={u.id}
            eintrag={u}
            patienten={patienten}
            agentLaeuft={agentLaeuft}
            onVerwerfen={() => setOffeneZuordnung((l) => l.filter((x) => x.id !== u.id))}
            onZuordnen={async (patientId) => {
              setOffeneZuordnung((l) => l.filter((x) => x.id !== u.id));
              await runAgent(u.text, patientId);
            }}
          />
        ))}

        {/* Entwürfe */}
        {uebergaben.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-grau">
              Übergaben · {bestaetigt.length} von {uebergaben.length} bestätigt
            </h2>
            {[...entwuerfe, ...bestaetigt].map((u) => (
              <EntwurfKarte
                key={u.id + u.status}
                entwurf={u}
                agentLaeuft={agentLaeuft}
                onBestaetigt={laden}
                onNeuEinsprechen={(text) => runAgent(text, u.patient.id)}
              />
            ))}
          </section>
        )}
      </main>
      <TabLeiste />
    </>
  );
}

function ZuordnungKarte({
  eintrag,
  patienten,
  agentLaeuft,
  onVerwerfen,
  onZuordnen,
}: {
  eintrag: NichtZugeordnet;
  patienten: Patient[];
  agentLaeuft: boolean;
  onVerwerfen: () => void;
  onZuordnen: (patientId: string) => void;
}) {
  const [auswahl, setAuswahl] = useState("");
  return (
    <article className="karte anim-einblenden border-sonne bg-sonne-hell p-4">
      <p className="flex items-center gap-2 text-sm font-black text-sonne-dunkel">
        <IconWarnung className="h-4 w-4" /> Nicht zugeordnet
      </p>
      <p className="mt-1 text-xs font-bold text-grau">{eintrag.grund}</p>
      <blockquote className="mt-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold italic">„{eintrag.text}“</blockquote>
      <div className="mt-3 flex gap-2">
        <select className="feld !bg-white" value={auswahl} onChange={(e) => setAuswahl(e.target.value)}>
          <option value="">Patient auswählen …</option>
          {patienten.map((p) => (
            <option key={p.id} value={p.id}>
              Zi. {p.zimmer} · {p.name}
            </option>
          ))}
        </select>
        <button className="btn-primaer !px-3" disabled={!auswahl || agentLaeuft} onClick={() => onZuordnen(auswahl)}>
          Zuordnen
        </button>
      </div>
      <button className="mt-2 text-xs font-extrabold text-grau underline" onClick={onVerwerfen}>
        Verwerfen (kein Übergabeinhalt)
      </button>
    </article>
  );
}
