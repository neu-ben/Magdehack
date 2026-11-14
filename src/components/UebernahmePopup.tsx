"use client";

import { useState } from "react";
import type { BoardEintrag } from "@/lib/board";
import type { Highlight } from "@/lib/types";
import { ZimmerBadge } from "./EntwurfKarte";
import { IconHaken, IconWarnung } from "./Icons";
import { Otti } from "./Otti";
import { Verlauf } from "./Verlauf";

const HL_STIL: Record<Highlight["level"], string> = {
  kritisch: "bg-koralle-hell text-koralle-dunkel",
  beachten: "bg-sonne-hell text-sonne-dunkel",
  info: "bg-himmel-hell text-himmel",
};

/** Erstes, was man nach dem Login sieht: Überblick über die vorherige Schicht. Bestätigen = Übernahme. */
export function UebernahmePopup({
  vorname,
  vorherSchicht,
  bereich,
  eintraege,
  onUebernommen,
}: {
  vorname: string;
  vorherSchicht: string;
  bereich: string;
  eintraege: BoardEintrag[];
  onUebernommen: () => void;
}) {
  const [offen, setOffen] = useState<string | null>(null);
  const [senden, setSenden] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const kritisch = eintraege.flatMap((e) =>
    e.uebergabe?.status === "bestaetigt"
      ? (e.uebergabe.warnings ?? []).filter((w) => w.level === "rot").map((w) => ({ patient: e.patient, text: w.text }))
      : [],
  );
  const ohne = eintraege.filter((e) => !e.neuaufnahme && (!e.uebergabe || e.uebergabe.status === "entwurf"));

  async function uebernehmen() {
    setSenden(true);
    setFehler(null);
    const res = await fetch("/api/uebernahme", { method: "POST" });
    setSenden(false);
    if (!res.ok) {
      setFehler((await res.json().catch(() => ({}))).error ?? "Übernahme fehlgeschlagen");
      return;
    }
    onUebernommen();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-tinte/45" role="dialog" aria-modal="true" aria-labelledby="uebernahme-titel">
      <div className="anim-einblenden m-3 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[456px] flex-col overflow-hidden rounded-3xl border-2 border-b-[6px] border-linie bg-white">
        {/* Kopf */}
        <div className="flex items-center gap-3 bg-tuerkis px-4 py-3 text-white">
          <Otti stimmung={kritisch.length ? "sorge" : "freude"} groesse={64} className="shrink-0 rounded-2xl bg-white/90" />
          <div>
            <p id="uebernahme-titel" className="text-lg font-black leading-tight">
              Übergabe vom {vorherSchicht}
            </p>
            <p className="text-sm font-bold opacity-90">
              {bereich} · {eintraege.length} Patienten
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-3 text-[15px] font-bold leading-snug">
            Guten Start, {vorname}! {kritisch.length ? "Erst das Wichtigste:" : "Hier ist, was in der Nacht los war."}
          </p>

          {/* Kritische Hinweise zuerst */}
          {kritisch.length > 0 && (
            <ul className="mb-4 flex flex-col gap-2">
              {kritisch.map((k, i) => (
                <li key={i} className="flex gap-2 rounded-xl border-2 border-koralle bg-koralle-hell px-3 py-2 text-sm font-bold text-koralle-dunkel">
                  <IconWarnung className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <span className="font-black">
                      Zi. {k.patient.zimmer} · {k.patient.name}:
                    </span>{" "}
                    {k.text}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Pro Patient eine Zeile */}
          <ul className="flex flex-col gap-2">
            {eintraege.map((e) => {
              const u = e.uebergabe?.status === "bestaetigt" || e.uebergabe?.status === "uebernommen" ? e.uebergabe : null;
              const auf = offen === e.patient.id;
              const gelb = (u?.warnings ?? []).filter((w) => w.level === "gelb");
              return (
                <li key={e.patient.id} className="rounded-2xl border-2 border-linie">
                  <button className="flex w-full items-start gap-3 px-3 py-2.5 text-left" onClick={() => setOffen(auf ? null : e.patient.id)} aria-expanded={auf}>
                    <ZimmerBadge zimmer={e.patient.zimmer} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold leading-tight">{e.patient.name}</span>
                      {u ? (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {(u.highlights ?? []).slice(0, 2).map((h, i) => (
                            <span key={i} className={`rounded-md px-1.5 py-0.5 text-[11px] font-extrabold ${HL_STIL[h.level]}`}>
                              {h.text}
                            </span>
                          ))}
                          {(u.highlights ?? []).length === 0 && <span className="text-xs font-bold text-grau">{u.situation}</span>}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-sonne-dunkel">
                          {e.neuaufnahme ? "Neuaufnahme heute, noch keine Übergabe" : `Keine bestätigte Übergabe vom ${vorherSchicht}`}
                        </span>
                      )}
                    </span>
                    {u && (u.tasks ?? []).length > 0 && (
                      <span className="shrink-0 rounded-lg bg-flaeche px-2 py-1 text-[11px] font-extrabold text-grau">{u.tasks.length} Aufg.</span>
                    )}
                  </button>

                  {auf && u && (
                    <div className="flex flex-col gap-2 border-t-2 border-linie px-3 py-3 text-sm font-semibold leading-snug">
                      {gelb.map((w, i) => (
                        <p key={i} className="flex gap-2 rounded-xl bg-sonne-hell px-3 py-2 font-bold text-sonne-dunkel">
                          <IconWarnung className="mt-0.5 h-4 w-4 shrink-0" />
                          {w.text}
                        </p>
                      ))}
                      <p>
                        <span className="font-black text-tuerkis">S </span>
                        {u.situation}
                      </p>
                      <p>
                        <span className="font-black text-tuerkis">R </span>
                        {u.recommendation}
                      </p>
                      {(e.verlauf.blutdruck || e.verlauf.puls) && (
                        <div className="flex flex-col gap-1 rounded-xl bg-flaeche px-3 py-2">
                          {e.verlauf.blutdruck && <Verlauf typ="blutdruck" punkte={e.verlauf.blutdruck} />}
                          {e.verlauf.puls && <Verlauf typ="puls" punkte={e.verlauf.puls} />}
                        </div>
                      )}
                      {(u.tasks ?? []).length > 0 && (
                        <ul className="flex flex-col gap-1">
                          {u.tasks.map((t, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-grau/50" />
                              <span>
                                {t.text}
                                {t.faellig && <span className="ml-1 text-xs font-extrabold text-tuerkis">· {t.faellig}</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {ohne.length > 0 && (
            <p className="mt-3 rounded-xl bg-sonne-hell px-3 py-2 text-sm font-bold text-sonne-dunkel">
              Ohne bestätigte Übergabe: {ohne.map((e) => `Zi. ${e.patient.zimmer}`).join(", ")}. Bitte direkt beim {vorherSchicht} nachfragen.
            </p>
          )}
          {fehler && <p className="mt-3 rounded-xl bg-koralle-hell px-3 py-2 text-sm font-bold text-koralle-dunkel">{fehler}</p>}
        </div>

        {/* Bestätigen = Übernahme */}
        <div className="border-t-2 border-linie bg-flaeche px-4 py-3">
          <button className="btn-primaer w-full !py-4 text-base" onClick={uebernehmen} disabled={senden}>
            <IconHaken /> {senden ? "…" : "Alles gesichtet, übernehmen"}
          </button>
        </div>
      </div>
    </div>
  );
}
