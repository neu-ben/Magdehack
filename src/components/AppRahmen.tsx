"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { abmelden } from "@/app/actions";
import { IconBoard, IconChat, IconMikro, IconTuer } from "./Icons";

/** Leiste oben: angemeldete Pflegekraft, Klick aufs Kürzel öffnet das Konto-Menü */
export function StatusLeiste({ name }: { name: string }) {
  const initialen = name.split(" ").map((t) => t[0]).join("");
  const [offen, setOffen] = useState(false);
  const bereich = useRef<HTMLDivElement>(null);

  // Menü schließen bei Klick daneben oder Escape
  useEffect(() => {
    if (!offen) return;
    const klick = (e: MouseEvent) => {
      if (!bereich.current?.contains(e.target as Node)) setOffen(false);
    };
    const taste = (e: KeyboardEvent) => e.key === "Escape" && setOffen(false);
    document.addEventListener("mousedown", klick);
    document.addEventListener("keydown", taste);
    return () => {
      document.removeEventListener("mousedown", klick);
      document.removeEventListener("keydown", taste);
    };
  }, [offen]);

  return (
    <div className="sticky top-0 z-20 flex items-center border-b-2 border-linie bg-white px-4 py-2.5">
      <div ref={bereich} className="relative">
        <button
          type="button"
          onClick={() => setOffen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={offen}
          className="flex items-center gap-3 rounded-xl pr-2 hover:bg-flaeche"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-b-4 border-linie bg-tuerkis-hell text-sm font-black text-tuerkis">
            {initialen}
          </span>
          <span className="text-sm font-extrabold text-tinte">{name}</span>
        </button>
        {offen && (
          <div role="menu" className="karte anim-einblenden absolute left-0 top-full mt-2 w-56 p-2 shadow-lg">
            <p className="px-3 pb-2 pt-1 text-xs font-bold text-grau">Angemeldet als {name}</p>
            <form action={abmelden}>
              <button
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold uppercase tracking-wide text-koralle hover:bg-koralle-hell"
              >
                <IconTuer />
                Abmelden
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export function KopfBand({ titel, untertitel }: { titel: string; untertitel: string }) {
  return (
    <div className="bg-tuerkis px-5 py-4 text-white">
      <h1 className="text-xl font-black leading-tight">{titel}</h1>
      <p className="mt-0.5 text-sm font-bold opacity-90">{untertitel}</p>
    </div>
  );
}

export function TabLeiste() {
  const pfad = usePathname();
  const tabs = [
    { href: "/schicht", label: "Schicht", icon: <IconMikro /> },
    { href: "/board", label: "Board", icon: <IconBoard /> },
    { href: "/otti", label: "Otti", icon: <IconChat /> },
  ];
  return (
    <nav className="sticky bottom-0 z-20 mt-auto flex items-center justify-around border-t-2 border-linie bg-white px-2 py-2">
      {tabs.map((t) => {
        const aktiv = pfad.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-col items-center rounded-xl border-2 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wide ${
              aktiv ? "border-tuerkis/40 bg-tuerkis-hell text-tuerkis" : "border-transparent text-grau hover:text-tinte"
            }`}
          >
            {t.icon}
            {t.label}
          </Link>
        );
      })}
      <form action={abmelden}>
        <button className="flex flex-col items-center px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-grau hover:text-koralle">
          <IconTuer />
          Abmelden
        </button>
      </form>
    </nav>
  );
}
