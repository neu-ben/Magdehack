"use client";

import { useEffect, useRef, useState } from "react";
import type { EigeneAufgabe, Notiz } from "@/lib/notizen";
import type { AbhakVorschlag, ChatZug } from "@/lib/otti";
import type { Patient } from "@/lib/types";
import { useSpeech } from "@/lib/useSpeech";
import { KopfBand, StatusLeiste, TabLeiste } from "./AppRahmen";
import { IconHaken, IconMikro, IconStopp } from "./Icons";
import { NotizKarte, PatientChip } from "./Notizen";
import { Otti } from "./Otti";

type Info = { name: string; vorname: string; schicht: string; bereich: string };

type Eintrag =
  | { art: "notiz"; id: string } // gespeicherte Notiz aus dieser Schicht (nach dem Neuladen)
  | { art: "pflege"; text: string }
  | { art: "otti"; antwort: string; notizen: string[]; aufgaben: EigeneAufgabe[]; abhaken: AbhakVorschlag[] }
  | { art: "fehler"; text: string };

export function OttiChat({
  info,
  patienten,
  notizen: start,
  nurFragen,
}: {
  info: Info;
  patienten: Patient[];
  notizen: Notiz[];
  nurFragen: boolean;
}) {
  const sp = useSpeech();
  // Notizen nach id; null = gelöscht
  const [notizen, setNotizen] = useState<Record<string, Notiz | null>>(() => Object.fromEntries(start.map((n) => [n.id, n])));
  const [eintraege, setEintraege] = useState<Eintrag[]>(() => start.map((n) => ({ art: "notiz", id: n.id })));
  const [aufgabeStatus, setAufgabeStatus] = useState<Record<string, "rueckgaengig">>({});
  const [abgehakt, setAbgehakt] = useState<Record<string, boolean>>({});
  const [laedt, setLaedt] = useState(false);
  const ende = useRef<HTMLDivElement>(null);

  const eingabe = (sp.text + (sp.zwischen ? " " + sp.zwischen : "")).trim();
  const leer = eintraege.length === 0;

  // Neue Nachrichten ins Bild scrollen
  useEffect(() => {
    if (eintraege.length) ende.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [eintraege.length, laedt]);

  async function senden(text: string) {
    const nachricht = text.trim();
    if (!nachricht || laedt) return;
    const verlauf: ChatZug[] = eintraege
      .flatMap((e): ChatZug[] =>
        e.art === "pflege" ? [{ rolle: "pflege", text: e.text }] : e.art === "otti" ? [{ rolle: "otti", text: e.antwort }] : [],
      )
      .slice(-6);
    sp.setText("");
    setEintraege((l) => [...l, { art: "pflege", text: nachricht }]);
    setLaedt(true);
    try {
      const res = await fetch("/api/otti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nachricht, verlauf }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Otti ist gerade nicht erreichbar.");
      const neu = j.notizen as Notiz[];
      setNotizen((m) => ({ ...m, ...Object.fromEntries(neu.map((n) => [n.id, n])) }));
      setEintraege((l) => [...l, { art: "otti", antwort: j.antwort, notizen: neu.map((n) => n.id), aufgaben: j.aufgaben, abhaken: j.abhaken }]);
    } catch (err) {
      setEintraege((l) => [...l, { art: "fehler", text: err instanceof Error ? err.message : "Unbekannter Fehler" }]);
    } finally {
      setLaedt(false);
    }
  }

  async function patientAendern(id: string, patientId: string | null) {
    const alt = notizen[id];
    setNotizen((m) => ({ ...m, [id]: m[id] && { ...m[id]!, patient_id: patientId } }));
    const res = await fetch(`/api/notizen/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: patientId }),
    });
    if (!res.ok) setNotizen((m) => ({ ...m, [id]: alt }));
  }

  async function notizLoeschen(id: string) {
    const alt = notizen[id];
    setNotizen((m) => ({ ...m, [id]: null }));
    const res = await fetch(`/api/notizen/${id}`, { method: "DELETE" });
    if (!res.ok) setNotizen((m) => ({ ...m, [id]: alt }));
  }

  async function aufgabeRueckgaengig(id: string) {
    setAufgabeStatus((m) => ({ ...m, [id]: "rueckgaengig" }));
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!res.ok)
      setAufgabeStatus((m) => {
        const rest = { ...m };
        delete rest[id];
        return rest;
      });
  }

  async function abhaken(id: string) {
    setAbgehakt((m) => ({ ...m, [id]: true }));
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ erledigt: true }),
    });
    if (!res.ok) setAbgehakt((m) => ({ ...m, [id]: false }));
  }

  const beispielPatient = patienten[0]?.name.split(" ").at(-1);
  const chips = [
    { label: "Notiz einsprechen", aktion: () => sp.start(), aus: nurFragen || !sp.unterstuetzt },
    ...(beispielPatient ? [{ label: `Wie war der Blutdruck von ${beispielPatient}?`, aktion: () => senden(`Wie war der Blutdruck von ${beispielPatient}?`), aus: false }] : []),
    { label: "Was ist noch offen?", aktion: () => senden("Was ist noch offen?"), aus: false },
  ];

  const notizKarte = (id: string) => {
    const n = notizen[id];
    if (!n) return <p key={id} className="text-xs font-bold italic text-grau">Notiz gelöscht</p>;
    return (
      <NotizKarte
        key={id}
        notiz={n}
        patienten={patienten}
        onPatient={nurFragen ? undefined : (p) => patientAendern(id, p)}
        onLoeschen={nurFragen ? undefined : () => notizLoeschen(id)}
      />
    );
  };

  return (
    <>
      <StatusLeiste name={info.name} />
      <KopfBand titel="Otti" untertitel={`Notizen, Fragen & Erinnerungen · ${info.schicht} · ${info.bereich}`} />

      <main className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-4">
        {nurFragen && (
          <p className="rounded-2xl border-2 border-sonne bg-sonne-hell px-4 py-3 text-sm font-bold text-sonne-dunkel">
            Deine Übergabe ist bestätigt. Otti beantwortet jetzt nur noch Fragen.
          </p>
        )}

        {/* Begrüßung */}
        <OttiBlase>
          {start.length === 0
            ? `Hallo ${info.vorname}! Erzähl mir, was dir auffällt, frag mich etwas zu deinen Patienten oder lass dich an etwas erinnern. Notizen baue ich später in deine Übergabe ein.`
            : `Hallo ${info.vorname}! Hier sind deine Notizen aus dieser Schicht.`}
        </OttiBlase>
        {leer && (
          <div className="flex flex-wrap gap-2 pl-12">
            {chips.map((c) => (
              <button
                key={c.label}
                onClick={c.aktion}
                disabled={c.aus || laedt}
                className="rounded-full border-2 border-b-4 border-linie bg-white px-3 py-1.5 text-xs font-extrabold text-tuerkis hover:bg-tuerkis-hell disabled:opacity-40"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {/* Verlauf */}
        {eintraege.map((e, i) => {
          if (e.art === "notiz") return <div key={i} className="pl-12">{notizKarte(e.id)}</div>;
          if (e.art === "pflege")
            return (
              <p key={i} className="anim-einblenden ml-12 self-end rounded-2xl rounded-br-md bg-tuerkis px-4 py-2.5 text-[15px] font-bold text-white">
                {e.text}
              </p>
            );
          if (e.art === "fehler")
            return (
              <p key={i} className="rounded-2xl bg-koralle-hell px-4 py-3 text-sm font-bold text-koralle-dunkel">
                {e.text}
              </p>
            );
          return (
            <div key={i} className="flex flex-col gap-2">
              <OttiBlase>{e.antwort}</OttiBlase>
              {(e.notizen.length > 0 || e.aufgaben.length > 0 || e.abhaken.length > 0) && (
                <div className="flex flex-col gap-2 pl-12">
                  {e.notizen.map(notizKarte)}
                  {e.aufgaben.map((a) => (
                    <div key={a.id} className="anim-einblenden rounded-2xl border-2 border-b-4 border-himmel/40 bg-himmel-hell px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-himmel">
                          {aufgabeStatus[a.id] ? "Rückgängig gemacht" : "Aufgabe angelegt"}
                          {a.faellig && ` · ${a.faellig}`}
                        </span>
                        <PatientChip patientId={a.patient_id} patienten={patienten} />
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <p className={`flex-1 text-sm font-semibold ${aufgabeStatus[a.id] ? "text-grau line-through" : ""}`}>{a.text}</p>
                        {!aufgabeStatus[a.id] && (
                          <button className="text-xs font-extrabold text-grau underline hover:text-koralle-dunkel" onClick={() => aufgabeRueckgaengig(a.id)}>
                            Rückgängig
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {e.abhaken.map((a) => (
                    <div key={a.id} className="anim-einblenden flex items-center gap-2 rounded-2xl border-2 border-b-4 border-linie bg-white px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-grau">Offene Aufgabe</p>
                        <p className="text-sm font-semibold">{a.text}</p>
                      </div>
                      {abgehakt[a.id] ? (
                        <span className="flex items-center gap-1 text-xs font-extrabold text-tuerkis">
                          <IconHaken className="h-4 w-4" /> Abgehakt
                        </span>
                      ) : (
                        <button className="btn-primaer !px-3 !py-2 !text-xs" onClick={() => abhaken(a.id)}>
                          Aufgabe abhaken?
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {laedt && (
          <div className="flex items-end gap-2">
            <Otti stimmung="denkt" groesse={44} wippen className="shrink-0" />
            <p className="rounded-2xl rounded-bl-md border-2 border-linie bg-white px-4 py-2.5 text-[15px] font-bold text-grau">
              <span className="animate-pulse">Otti überlegt …</span>
            </p>
          </div>
        )}
        <div ref={ende} />
      </main>

      {/* Eingabe: Mikro oder tippen */}
      <form
        className="sticky bottom-[66px] z-10 border-t-2 border-linie bg-white px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          void senden(eingabe);
        }}
      >
        {sp.fehler && <p className="mb-1 text-xs font-bold text-koralle-dunkel">{sp.fehler}</p>}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={sp.aktiv ? sp.stop : sp.start}
            disabled={laedt || !sp.unterstuetzt}
            className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-full border-b-4 text-white active:translate-y-0.5 active:border-b-2 disabled:opacity-40 ${
              sp.aktiv ? "puls-ring border-koralle-dunkel bg-koralle" : "border-tuerkis-dunkel bg-tuerkis"
            }`}
            aria-label={sp.aktiv ? "Aufnahme stoppen" : "Sprechen"}
          >
            <span className="relative">{sp.aktiv ? <IconStopp className="h-6 w-6" /> : <IconMikro className="h-6 w-6" />}</span>
          </button>
          <textarea
            rows={2}
            className="feld flex-1 resize-none !py-2 text-[15px]"
            placeholder={sp.aktiv ? "Ich höre zu …" : nurFragen ? "Frag Otti …" : "Notiz, Frage oder Erinnerung …"}
            value={eingabe}
            onChange={(e) => sp.setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!sp.aktiv) void senden(eingabe);
              }
            }}
            disabled={sp.aktiv}
          />
          <button type="submit" className="btn-primaer !px-4" disabled={!eingabe || sp.aktiv || laedt}>
            Senden
          </button>
        </div>
      </form>
      <TabLeiste />
    </>
  );
}

function OttiBlase({ children }: { children: React.ReactNode }) {
  return (
    <div className="anim-einblenden flex items-end gap-2">
      <Otti stimmung="freude" groesse={44} className="shrink-0" />
      <p className="mr-6 rounded-2xl rounded-bl-md border-2 border-linie bg-white px-4 py-2.5 text-[15px] font-bold leading-snug">{children}</p>
    </div>
  );
}
