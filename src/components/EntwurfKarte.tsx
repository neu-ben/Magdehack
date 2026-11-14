"use client";

import { useState } from "react";
import type { Aufgabe, Entwurf, Highlight, Messwert, Warnung } from "@/lib/types";
import { useSpeech } from "@/lib/useSpeech";
import { VITALS, zone, type VitalDef, type Zone } from "@/lib/vitals-config";
import { IconHaken, IconMikro, IconStift, IconStopp, IconWarnung, IconX } from "./Icons";

const HL_STIL: Record<Highlight["level"], string> = {
  kritisch: "bg-koralle-hell text-koralle-dunkel border-koralle/40",
  beachten: "bg-sonne-hell text-sonne-dunkel border-sonne/50",
  info: "bg-himmel-hell text-himmel border-himmel/30",
};
const HL_PUNKT: Record<Highlight["level"], string> = { kritisch: "bg-koralle", beachten: "bg-sonne", info: "bg-himmel" };
const ZONE_STIL: Record<Zone, string> = {
  normal: "border-linie bg-white",
  kulanz: "border-sonne bg-sonne-hell",
  kritisch: "border-koralle bg-koralle-hell",
};

function messwertZone(def: VitalDef, v: Messwert): Zone {
  if (v.status !== "gemessen" || v.wert == null) return "normal";
  const z1 = zone(def.grenzen, v.wert);
  const z2 = def.grenzen2 && v.wert2 != null ? zone(def.grenzen2, v.wert2) : "normal";
  const rang = { normal: 0, kulanz: 1, kritisch: 2 };
  return rang[z1] >= rang[z2] ? z1 : z2;
}

export function EntwurfKarte({
  entwurf,
  onBestaetigt,
  onNeuEinsprechen,
  agentLaeuft,
}: {
  entwurf: Entwurf;
  onBestaetigt: () => void;
  onNeuEinsprechen: (text: string) => Promise<void>;
  agentLaeuft: boolean;
}) {
  const p = entwurf.patient;
  const [sbar, setSbar] = useState({
    situation: entwurf.situation,
    background: entwurf.background,
    assessment: entwurf.assessment,
    recommendation: entwurf.recommendation,
  });
  const [highlights, setHighlights] = useState<Highlight[]>(entwurf.highlights ?? []);
  const [warnings, setWarnings] = useState<Warnung[]>(entwurf.warnings ?? []);
  const [tasks, setTasks] = useState<Aufgabe[]>(entwurf.tasks ?? []);
  const [vitals, setVitals] = useState<Messwert[]>(() =>
    (entwurf.vitals ?? []).map((v) => ({ ...v, status: v.status ?? "gemessen" })),
  );
  const [bearbeiten, setBearbeiten] = useState(false);
  const [neuModus, setNeuModus] = useState(false);
  const [senden, setSenden] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [neueAufgabe, setNeueAufgabe] = useState("");

  const bestaetigt = entwurf.status !== "entwurf";

  const setzeWert = (typ: string, feld: "wert" | "wert2", roh: string) => {
    const zahl = roh === "" ? null : Number(roh.replace(",", "."));
    setVitals((vs) => {
      const vorhanden = vs.find((v) => v.typ === typ);
      if (!vorhanden) return [...vs, { typ, wert: null, wert2: null, status: "gemessen", [feld]: zahl }];
      return vs.map((v) => (v.typ === typ ? { ...v, status: "gemessen", [feld]: zahl } : v));
    });
  };
  const nichtErhoben = (typ: string) =>
    setVitals((vs) => [...vs.filter((v) => v.typ !== typ), { typ, wert: null, wert2: null, status: "nicht_erhoben" }]);
  const entferneWert = (typ: string) => setVitals((vs) => vs.filter((v) => v.typ !== typ));

  const pflichtOffen = VITALS.filter((d) => d.pflicht).filter((d) => {
    const v = vitals.find((x) => x.typ === d.typ);
    if (!v) return true;
    if (v.status === "nicht_erhoben") return false;
    return v.wert == null || Number.isNaN(v.wert) || (!!d.zweiWerte && (v.wert2 == null || Number.isNaN(v.wert2)));
  });

  async function bestaetigen() {
    setSenden(true);
    setFehler(null);
    const res = await fetch(`/api/drafts/${entwurf.id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...sbar,
        highlights,
        warnings,
        tasks,
        vitals: vitals.filter((v) => v.status === "nicht_erhoben" || v.wert != null),
      }),
    });
    setSenden(false);
    if (!res.ok) {
      setFehler((await res.json().catch(() => ({}))).error ?? "Bestätigen fehlgeschlagen");
      return;
    }
    onBestaetigt();
  }

  // Bestätigte Karte: kompakt
  if (bestaetigt) {
    return (
      <article className="karte anim-einblenden flex items-center gap-3 border-tuerkis/40 bg-tuerkis-hell px-4 py-3">
        <ZimmerBadge zimmer={p.zimmer} />
        <div className="flex-1">
          <p className="font-extrabold">{p.name}</p>
          <p className="text-xs font-bold text-tuerkis-dunkel">Übergabe bestätigt</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-tuerkis text-white">
          <IconHaken />
        </span>
      </article>
    );
  }

  return (
    <article className="karte anim-einblenden overflow-hidden">
      {/* Kopf */}
      <header className="flex items-start gap-3 border-b-2 border-linie px-4 py-3">
        <ZimmerBadge zimmer={p.zimmer} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black leading-tight">{p.name}</p>
          <p className="truncate text-xs font-bold text-grau">
            {p.alter} J. · {p.diagnose}
          </p>
        </div>
        <span className="rounded-lg bg-sonne-hell px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-sonne-dunkel">
          Entwurf
        </span>
      </header>

      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Hervorhebungen */}
        {highlights.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {highlights.map((h, i) => (
              <li key={i} className={`flex items-start gap-2 rounded-xl border-2 px-3 py-2 text-sm font-bold ${HL_STIL[h.level]}`}>
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${HL_PUNKT[h.level]}`} />
                <span className="flex-1">{h.text}</span>
                <button onClick={() => setHighlights((hs) => hs.filter((_, j) => j !== i))} className="opacity-50 hover:opacity-100" aria-label="Entfernen">
                  <IconX />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Messwerte */}
        <section>
          <Titel>Messwerte</Titel>
          <div className="grid grid-cols-2 gap-2">
            {VITALS.map((def) => {
              const v = vitals.find((x) => x.typ === def.typ);
              if (!v && !def.pflicht) return null;
              if (v?.status === "nicht_erhoben")
                return (
                  <div key={def.typ} className="flex items-center justify-between rounded-xl border-2 border-dashed border-linie px-3 py-2">
                    <span className="text-xs font-extrabold text-grau">{def.label}: nicht erhoben</span>
                    <button onClick={() => entferneWert(def.typ)} className="text-grau hover:text-tinte" aria-label="Zurücksetzen">
                      <IconX />
                    </button>
                  </div>
                );
              const fehlt = !v || v.wert == null;
              const stil = fehlt && def.pflicht ? "border-sonne bg-sonne-hell" : v ? ZONE_STIL[messwertZone(def, v)] : "";
              return (
                <div key={def.typ} className={`rounded-xl border-2 px-3 py-2 ${stil}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-grau">{def.label}</span>
                    {fehlt && def.pflicht && (
                      <span className="flex items-center gap-1 text-[11px] font-extrabold text-sonne-dunkel">
                        <IconWarnung className="h-3.5 w-3.5" /> fehlt
                      </span>
                    )}
                    {!def.pflicht && (
                      <button onClick={() => entferneWert(def.typ)} className="text-grau hover:text-tinte" aria-label="Entfernen">
                        <IconX className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <Zahl wert={v?.wert ?? null} onChange={(s) => setzeWert(def.typ, "wert", s)} />
                    {def.zweiWerte && (
                      <>
                        <span className="font-black text-grau">/</span>
                        <Zahl wert={v?.wert2 ?? null} onChange={(s) => setzeWert(def.typ, "wert2", s)} />
                      </>
                    )}
                    <span className="text-xs font-bold text-grau">{def.einheit}</span>
                  </div>
                  {fehlt && def.pflicht && (
                    <button onClick={() => nichtErhoben(def.typ)} className="mt-1 text-[11px] font-extrabold text-grau underline hover:text-tinte">
                      nicht erhoben
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {/* Optionale Werte hinzufügen */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {VITALS.filter((d) => !d.pflicht && !vitals.some((v) => v.typ === d.typ)).map((d) => (
              <button
                key={d.typ}
                onClick={() => setVitals((vs) => [...vs, { typ: d.typ, wert: null, wert2: null, status: "gemessen" }])}
                className="rounded-lg border-2 border-linie px-2 py-1 text-xs font-extrabold text-tuerkis hover:bg-tuerkis-hell"
              >
                + {d.label}
              </button>
            ))}
          </div>
        </section>

        {/* SBAR */}
        <section>
          <div className="flex items-center justify-between">
            <Titel>Übergabe (SBAR)</Titel>
            <button onClick={() => setBearbeiten((b) => !b)} className="flex items-center gap-1 text-xs font-extrabold text-tuerkis">
              <IconStift className="h-4 w-4" /> {bearbeiten ? "Fertig" : "Bearbeiten"}
            </button>
          </div>
          <dl className="flex flex-col gap-2">
            {(
              [
                ["situation", "S", "Situation"],
                ["background", "B", "Hintergrund"],
                ["assessment", "A", "Einschätzung"],
                ["recommendation", "R", "Empfehlung"],
              ] as const
            ).map(([k, buchstabe, label]) => (
              <div key={k} className="flex gap-2">
                <dt className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-tuerkis-hell text-xs font-black text-tuerkis" title={label}>
                  {buchstabe}
                </dt>
                <dd className="flex-1 text-sm font-semibold leading-snug">
                  {bearbeiten ? (
                    <textarea className="feld min-h-16" value={sbar[k]} onChange={(e) => setSbar((s) => ({ ...s, [k]: e.target.value }))} />
                  ) : (
                    sbar[k]
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Warnungen */}
        {warnings.length > 0 && (
          <section>
            <Titel>Hinweise von Otti</Titel>
            <ul className="flex flex-col gap-1.5">
              {warnings.map((w, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-2 rounded-xl border-2 px-3 py-2 text-sm font-bold ${
                    w.level === "rot" ? "border-koralle bg-koralle-hell text-koralle-dunkel" : "border-sonne bg-sonne-hell text-sonne-dunkel"
                  }`}
                >
                  <IconWarnung className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="flex-1">{w.text}</span>
                  <button onClick={() => setWarnings((ws) => ws.filter((_, j) => j !== i))} className="opacity-50 hover:opacity-100" aria-label="Verwerfen">
                    <IconX />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Aufgaben */}
        <section>
          <Titel>Aufgaben für die nächste Schicht</Titel>
          <ul className="flex flex-col gap-1.5">
            {tasks.map((t, i) => (
              <li key={i} className="flex items-start gap-2 rounded-xl bg-flaeche px-3 py-2 text-sm font-semibold">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-grau/50" />
                <span className="flex-1">
                  {t.text}
                  {t.faellig && <span className="ml-1 text-xs font-extrabold text-tuerkis">· {t.faellig}</span>}
                </span>
                <button onClick={() => setTasks((ts) => ts.filter((_, j) => j !== i))} className="text-grau hover:text-tinte" aria-label="Entfernen">
                  <IconX />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!neueAufgabe.trim()) return;
              setTasks((ts) => [...ts, { text: neueAufgabe.trim(), faellig: null }]);
              setNeueAufgabe("");
            }}
          >
            <input className="feld" placeholder="Aufgabe hinzufügen …" value={neueAufgabe} onChange={(e) => setNeueAufgabe(e.target.value)} />
          </form>
        </section>

        {neuModus && (
          <NeuEinsprechen
            name={p.name}
            agentLaeuft={agentLaeuft}
            onAbbrechen={() => setNeuModus(false)}
            onAuswerten={async (text) => {
              setNeuModus(false);
              await onNeuEinsprechen(text);
            }}
          />
        )}

        {fehler && <p className="rounded-xl bg-koralle-hell px-3 py-2 text-sm font-bold text-koralle-dunkel">{fehler}</p>}
      </div>

      {/* Aktionen */}
      <footer className="flex gap-2 border-t-2 border-linie bg-flaeche px-4 py-3">
        <button className="btn-weiss flex-1 !px-3" onClick={() => setNeuModus(true)} disabled={neuModus || agentLaeuft}>
          <IconMikro className="h-4 w-4" /> Neu einsprechen
        </button>
        <button
          className="btn-primaer flex-1 !px-3"
          onClick={bestaetigen}
          disabled={senden || pflichtOffen.length > 0}
          title={pflichtOffen.length ? `Fehlt noch: ${pflichtOffen.map((d) => d.label).join(", ")}` : undefined}
        >
          <IconHaken className="h-4 w-4" /> {senden ? "…" : "Bestätigen"}
        </button>
      </footer>
    </article>
  );
}

function NeuEinsprechen({
  name,
  agentLaeuft,
  onAbbrechen,
  onAuswerten,
}: {
  name: string;
  agentLaeuft: boolean;
  onAbbrechen: () => void;
  onAuswerten: (text: string) => void;
}) {
  const sp = useSpeech();
  // Im Feld ungekürzt anzeigen (sonst verschwindet jedes Leerzeichen am Ende), gekürzt senden
  const feldText = sp.text + (sp.zwischen ? " " + sp.zwischen : "");
  const text = feldText.trim();
  return (
    <div className="rounded-2xl border-2 border-dashed border-tuerkis bg-tuerkis-hell p-3">
      <p className="text-sm font-extrabold text-tuerkis-dunkel">Neu einsprechen für {name}</p>
      <p className="text-xs font-semibold text-grau">Ersetzt nur diesen Patienten. Deine Änderungen auf der Karte gehen dabei verloren.</p>
      <textarea className="feld mt-2 min-h-20" value={feldText} onChange={(e) => sp.setText(e.target.value)} placeholder="Sprechen oder tippen …" />
      <div className="mt-2 flex gap-2">
        {sp.aktiv ? (
          <button className="btn-koralle !px-3 !py-2" onClick={sp.stop}>
            <IconStopp className="h-4 w-4" /> Stopp
          </button>
        ) : (
          <button className="btn-weiss !px-3 !py-2" onClick={sp.start} disabled={!sp.unterstuetzt}>
            <IconMikro className="h-4 w-4" /> Sprechen
          </button>
        )}
        <button className="btn-primaer flex-1 !px-3 !py-2" disabled={!text || sp.aktiv || agentLaeuft} onClick={() => onAuswerten(text)}>
          Otti auswerten lassen
        </button>
        <button className="px-2 text-xs font-extrabold text-grau" onClick={onAbbrechen}>
          Abbrechen
        </button>
      </div>
      {sp.fehler && <p className="mt-1 text-xs font-bold text-koralle-dunkel">{sp.fehler}</p>}
    </div>
  );
}

function Zahl({ wert, onChange }: { wert: number | null; onChange: (s: string) => void }) {
  // Eigener Text-Zustand, damit Kommazahlen ("37,") beim Tippen nicht verschluckt werden
  const [text, setText] = useState(wert == null ? "" : String(wert).replace(".", ","));
  return (
    <input
      inputMode="decimal"
      className="w-14 bg-transparent text-2xl font-black text-tinte outline-none placeholder:text-grau/40"
      value={text}
      placeholder="–"
      onChange={(e) => {
        const s = e.target.value.replace(/[^\d,.]/g, "");
        setText(s);
        onChange(s);
      }}
    />
  );
}

export function ZimmerBadge({ zimmer }: { zimmer: string }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-b-4 border-tuerkis-dunkel bg-tuerkis text-lg font-black text-white">
      {zimmer}
    </span>
  );
}

function Titel({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-grau">{children}</h3>;
}
