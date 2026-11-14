"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { abmelden } from "@/app/actions";
import { IconBoard, IconChat, IconEntwurf, IconHaken, IconMikro, IconTuer, IconWarnung } from "./Icons";

export function StatusLeiste({
  name,
  offen,
  rot,
  bestaetigt,
  titel = ["Offene Entwürfe", "Rote Warnungen", "Bestätigt"],
}: {
  name: string;
  offen: number;
  rot: number;
  bestaetigt: number;
  titel?: [string, string, string];
}) {
  const initialen = name.split(" ").map((t) => t[0]).join("");
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-linie bg-white px-4 py-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-b-4 border-linie bg-tuerkis-hell text-sm font-black text-tuerkis" title={name}>
        {initialen}
      </span>
      <Stat icon={<IconEntwurf className="h-5 w-5 text-sonne-dunkel" />} wert={offen} titel={titel[0]} />
      <Stat icon={<IconWarnung className="h-5 w-5 text-koralle" />} wert={rot} titel={titel[1]} />
      <Stat icon={<IconHaken className="h-5 w-5 text-tuerkis" />} wert={bestaetigt} titel={titel[2]} />
    </div>
  );
}

function Stat({ icon, wert, titel }: { icon: React.ReactNode; wert: number; titel: string }) {
  return (
    <span className="flex items-center gap-1.5 text-base font-black text-tinte" title={titel}>
      {icon}
      {wert}
    </span>
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
      <span className="flex cursor-not-allowed flex-col items-center px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-grau/50" title="Mit Otti reden – kommt bald">
        <IconChat />
        Otti
      </span>
      <form action={abmelden}>
        <button className="flex flex-col items-center px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-grau hover:text-koralle">
          <IconTuer />
          Abmelden
        </button>
      </form>
    </nav>
  );
}
