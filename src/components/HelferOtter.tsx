"use client";

import { useEffect, useState } from "react";
import type { Patient } from "@/lib/types";
import { ZimmerBadge } from "./EntwurfKarte";
import { Otti } from "./Otti";

// Wartenanzeige während der Agent arbeitet:
// erst "Otti sortiert" (Zimmer werden nacheinander angeleuchtet), dann pro Patient ein Helfer-Otter,
// der im Mini-Teich schwimmt, bis der Entwurf fertig ist.

export type InArbeit = { id: string; name: string; zimmer: string };

const ARBEITSSCHRITTE = ["Verlauf lesen", "Werte gegen Normbereich prüfen", "Notizen und Aufgaben einbauen", "SBAR-Entwurf schreiben"];

function Sekunden({ seit }: { seit: number }) {
  const [jetzt, setJetzt] = useState(seit);
  useEffect(() => {
    const t = setInterval(() => setJetzt(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular-nums">{Math.max(0, Math.floor((jetzt - seit) / 1000))} s</span>;
}

function MiniTeich() {
  return (
    <span className="mini-teich" aria-hidden>
      <Otti stimmung="denkt" groesse={52} className="mini-otter" />
      <span className="mini-welle" />
    </span>
  );
}

export function HelferOtter({ patienten, inArbeit, seit }: { patienten: Patient[]; inArbeit: InArbeit[]; seit: number }) {
  // Phase 1: Otti teilt das Transkript nach Patienten auf
  if (inArbeit.length === 0) {
    const sortiert = [...patienten].sort((a, b) => a.zimmer.localeCompare(b.zimmer, "de", { numeric: true }));
    return (
      <section className="karte anim-einblenden flex flex-col gap-3 p-4" aria-live="polite">
        <div className="flex items-center gap-3">
          <MiniTeich />
          <div className="flex-1">
            <p className="font-extrabold">Otti sortiert nach Patienten …</p>
            <p className="text-xs font-bold text-grau">
              Wer wurde erwähnt? · <Sekunden seit={seit} />
            </p>
          </div>
        </div>
        <ul className="flex flex-wrap gap-2">
          {sortiert.map((p, i) => (
            <li key={p.id} className="scan-kachel" style={{ animationDelay: `${i * 0.35}s`, animationDuration: `${Math.max(1.4, sortiert.length * 0.35)}s` }}>
              <span className="text-base font-black leading-none">{p.zimmer}</span>
              <span className="text-[10px] font-extrabold">{p.name.split(" ").at(-1)}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  // Phase 2: Helfer-Otter arbeiten parallel
  return (
    <section className="flex flex-col gap-3" aria-live="polite">
      <h2 className="flex items-baseline justify-between text-xs font-extrabold uppercase tracking-widest text-grau">
        <span>
          {inArbeit.length} Helfer-Otter {inArbeit.length === 1 ? "arbeitet" : "arbeiten gleichzeitig"}
        </span>
        <span className="text-tuerkis">
          <Sekunden seit={seit} />
        </span>
      </h2>
      {inArbeit.map((p) => (
        <article key={p.id} className="karte anim-einblenden flex flex-col gap-3 border-dashed border-tuerkis/50 p-4">
          <header className="flex items-center gap-3">
            <ZimmerBadge zimmer={p.zimmer} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-extrabold">{p.name}</p>
              <div className="ticker text-xs font-bold text-tuerkis-dunkel">
                {ARBEITSSCHRITTE.map((t, i) => (
                  <span key={t} style={{ animationDelay: `${i * 2}s` }}>
                    {t} …
                  </span>
                ))}
              </div>
            </div>
            <MiniTeich />
          </header>
          <div className="flex flex-col gap-2" aria-hidden>
            <span className="schimmer h-3 w-11/12" />
            <span className="schimmer h-3 w-8/12" />
            <span className="schimmer h-3 w-10/12" />
          </div>
        </article>
      ))}
    </section>
  );
}
