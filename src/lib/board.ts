import type { Schicht, Sitzung } from "./session";
import { db } from "./supabase";
import type { Entwurf, Patient } from "./types";

/** Die Schicht, die vor meiner liegt (deren Übergabe ich übernehme). Nachtdienst gehört zum Datum, an dem er beginnt. */
export function vorherigeSchicht(datum: string, schicht: Schicht): { datum: string; schicht: Schicht } {
  if (schicht === "spaet") return { datum, schicht: "frueh" };
  if (schicht === "nacht") return { datum, schicht: "spaet" };
  const d = new Date(datum + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return { datum: d.toISOString().slice(0, 10), schicht: "nacht" };
}

export type VerlaufPunkt = { zeitpunkt: string; wert: number; wert2: number | null };
export type BoardEintrag = {
  patient: Patient;
  uebergabe: Entwurf | null;
  /** Heute aufgenommen, daher keine Übergabe aus der Vorschicht zu erwarten */
  neuaufnahme: boolean;
  verlauf: Record<string, VerlaufPunkt[]>; // typ -> Punkte, älteste zuerst
};

export async function ladeBoard(s: Sitzung): Promise<{ vorher: { datum: string; schicht: Schicht }; eintraege: BoardEintrag[] }> {
  const supa = db();
  const vorher = vorherigeSchicht(s.datum, s.schicht);

  const { data: patienten, error } = await supa.from("patients").select("*").eq("bereich", s.bereich);
  if (error) throw error;
  const ids = (patienten ?? []).map((p) => p.id);
  if (!ids.length) return { vorher, eintraege: [] };

  const [{ data: hs, error: e1 }, { data: vs, error: e2 }] = await Promise.all([
    supa
      .from("handovers")
      .select(
        "id, patient_id, status, transkript_abschnitt, situation, background, assessment, recommendation, highlights, vitals (typ, wert, wert2, status), warnings (level, text), tasks (id, text, faellig, erledigt)",
      )
      .in("patient_id", ids)
      .eq("datum", vorher.datum)
      .eq("schicht", vorher.schicht),
    // Verlauf nur aus bestätigten/übernommenen Übergaben
    supa
      .from("vitals")
      .select("patient_id, typ, wert, wert2, zeitpunkt, status, handovers!inner(status)")
      .in("patient_id", ids)
      .in("typ", ["blutdruck", "puls"])
      .eq("status", "gemessen")
      .neq("handovers.status", "entwurf")
      .order("zeitpunkt", { ascending: true }),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const eintraege: BoardEintrag[] = (patienten as Patient[]).map((p) => {
    const h = (hs ?? []).find((x) => x.patient_id === p.id);
    const verlauf: Record<string, VerlaufPunkt[]> = {};
    for (const v of (vs ?? []).filter((x) => x.patient_id === p.id)) {
      (verlauf[v.typ] ??= []).push({ zeitpunkt: v.zeitpunkt, wert: Number(v.wert), wert2: v.wert2 == null ? null : Number(v.wert2) });
    }
    for (const k of Object.keys(verlauf)) verlauf[k] = verlauf[k].slice(-5);
    return {
      patient: p,
      uebergabe: h ? ({ ...h, patient: p } as unknown as Entwurf) : null,
      neuaufnahme: !h && p.aufnahme_datum >= vorher.datum,
      verlauf,
    };
  });

  // Kritisches zuerst, dann Zimmer
  const gewicht = (e: BoardEintrag) =>
    e.neuaufnahme
      ? 0
      : !e.uebergabe || e.uebergabe.status === "entwurf"
      ? 50
      : (e.uebergabe.warnings ?? []).reduce((n, w) => n + (w.level === "rot" ? 100 : 1), 0);
  eintraege.sort((a, b) => gewicht(b) - gewicht(a) || a.patient.zimmer.localeCompare(b.patient.zimmer, "de", { numeric: true }));
  return { vorher, eintraege };
}
