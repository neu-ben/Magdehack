// Setzt die Demo zurück: Dienstplan für HEUTE, alle Übergaben löschen, vorbereiteten Verlauf
// (gestern Früh/Spät/Nacht) relativ zum heutigen Datum neu einspielen.
// Aufruf: npm run demo:reset
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const TZ = "Europe/Berlin";
const tag = (offset) => {
  const d = new Date(Date.now() + offset * 864e5);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d);
};
const heute = tag(0);
const gestern = tag(-1);
// Lokale Berliner Uhrzeit -> ISO (Winterzeit +01:00, Sommerzeit +02:00)
const zeit = (datum, hhmm) => {
  const probe = new Date(`${datum}T12:00:00Z`);
  const off = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "shortOffset" })
    .formatToParts(probe)
    .find((p) => p.type === "timeZoneName").value.replace("GMT", "");
  const [h, m = "00"] = off.split(":");
  const iso = `${datum}T${hhmm}:00${h.startsWith("-") ? "-" : "+"}${h.replace(/[+-]/, "").padStart(2, "0")}:${m}`;
  return new Date(iso).toISOString();
};

const MITARBEITER = [
  ["Anna Richter", "P-1023", "frueh", "Flur A"],
  ["Ben Krause", "P-1047", "spaet", "Flur A"],
  ["Clara Neumann", "P-1088", "nacht", "Flur A"],
  ["David Wolf", "P-1102", "frueh", "Flur B"],
  ["Eva Lehmann", "P-1115", "spaet", "Flur B"],
  ["Frank Busch", "P-1131", "nacht", "Flur B"],
];

const PATIENTEN = [
  ["Margarete Müller", 78, "w", "4", "Flur A", "Arterielle Hypertonie, Herzinsuffizienz NYHA II", -3],
  ["Karl Schneider", 66, "m", "3", "Flur A", "Ambulant erworbene Pneumonie", -4],
  ["Ingrid Becker", 84, "w", "5", "Flur A", "Exsikkose bei Harnwegsinfekt, erhöhtes Sturzrisiko", -2],
  ["Thomas Wagner", 59, "m", "6", "Flur A", "Entgleister Diabetes mellitus Typ 2, bekanntes Vorhofflimmern", -3],
  ["Peter Krüger", 52, "m", "7", "Flur A", "Thoraxschmerz zur Abklärung", 0],
  ["Helga Hoffmann", 71, "w", "8", "Flur B", "COPD-Exazerbation", -3],
  ["Jürgen Schulz", 69, "m", "9", "Flur B", "Obere GI-Blutung, Überwachung nach Gastroskopie", -2],
];

// [name, schicht, sys, dia, puls, schmerz, temp, spo2, situation, assessment, recommendation, highlights]
const VERLAUF = [
  ["Margarete Müller", "frueh", 138, 84, 78, 1, 36.8, 96, "Stabil, mobilisiert mit Rollator.", "Kreislauf stabil.", "Blutdruck weiter kontrollieren.", []],
  ["Margarete Müller", "spaet", 149, 88, 82, 2, 36.9, 95, "Klagt abends über leichten Druck im Kopf.", "Blutdruck etwas höher als morgens.", "Blutdruck in der Nacht kontrollieren.", [{ level: "beachten", text: "Leichter Kopfdruck am Abend" }]],
  ["Margarete Müller", "nacht", 158, 92, 84, 2, 36.7, 95, "Unruhiger Schlaf, Kopfdruck unverändert.", "Blutdruck erneut gestiegen.", "Visite: Blutdruck ansprechen.", [{ level: "beachten", text: "Blutdruck erneut höher" }]],
  ["Karl Schneider", "frueh", 128, 78, 96, 3, 38.9, 92, "Fieber, produktiver Husten, 2 l O2 über Nasenbrille.", "Infekt aktiv, Antibiose läuft (Tag 3).", "Temperatur und Sättigung engmaschig.", [{ level: "kritisch", text: "Fieber 38,9 °C" }]],
  ["Karl Schneider", "spaet", 124, 76, 90, 2, 38.2, 94, "Husten weniger, isst etwas.", "Leichte Besserung.", "O2 bei Sättigung über 94 % reduzieren.", []],
  ["Karl Schneider", "nacht", 122, 74, 84, 1, 37.6, 95, "Schläft gut, O2 auf 1 l reduziert.", "Deutliche Besserung.", "Mobilisation ab heute.", []],
  ["Ingrid Becker", "frueh", 112, 64, 88, 2, 37.4, 96, "Trinkt nur nach Aufforderung, Infusion läuft.", "Weiterhin Exsikkose-Risiko.", "Trinkprotokoll führen.", [{ level: "beachten", text: "Trinkmenge gering" }]],
  ["Ingrid Becker", "spaet", 116, 66, 84, 2, 37.2, 96, "Ca. 900 ml getrunken, nachts unruhig.", "Leicht verbessert.", "Bettgitter nach Rücksprache, Klingel in Reichweite.", [{ level: "beachten", text: "Nächtliche Unruhe, Sturzrisiko" }]],
  ["Ingrid Becker", "nacht", 118, 68, 80, 1, 37.0, 97, "Nachts einmal allein aufgestanden, kein Sturz.", "Sturzrisiko bleibt hoch.", "Sturzprophylaxe fortführen.", [{ level: "kritisch", text: "Allein aufgestanden, Sturzgefahr" }]],
  ["Thomas Wagner", "frueh", 132, 82, 102, 0, 36.9, 97, "BZ mittags 286 mg/dl, Insulinschema angepasst.", "Blutzucker noch hoch, Puls arrhythmisch bei bekanntem VHF.", "BZ vor jeder Mahlzeit.", [{ level: "beachten", text: "Blutzucker 286 mg/dl" }]],
  ["Thomas Wagner", "spaet", 128, 80, 98, 0, 36.8, 97, "BZ abends 214 mg/dl.", "Blutzucker fallend.", "Spätmahlzeit beachten.", []],
  ["Thomas Wagner", "nacht", 126, 78, 104, 0, 36.7, 98, "BZ nüchtern 168 mg/dl, schläft gut.", "Stabil, Puls im bekannten Bereich.", "Diabetesberatung anmelden.", []],
  ["Helga Hoffmann", "frueh", 136, 80, 98, 2, 37.1, 89, "Dyspnoe bei Belastung, 2 l O2.", "COPD-Exazerbation, Ziel-Sättigung 88–92 %.", "Inhalationen nach Plan.", []],
  ["Helga Hoffmann", "spaet", 134, 78, 94, 2, 37.0, 90, "Inhaliert selbstständig.", "Stabil im Zielbereich.", "Weiter wie gehabt.", []],
  ["Helga Hoffmann", "nacht", 130, 76, 92, 1, 36.9, 91, "Ruhige Nacht.", "Stabil.", "Mobilisation steigern.", []],
  ["Jürgen Schulz", "frueh", 118, 72, 88, 2, 36.8, 97, "Nach Gastroskopie, Clip gesetzt, nüchtern.", "Kreislauf stabil, Hb-Kontrolle angeordnet.", "Auf Teerstuhl achten.", []],
  ["Jürgen Schulz", "spaet", 116, 70, 90, 1, 36.7, 97, "Tee getrunken, kein Teerstuhl.", "Stabil.", "Kostaufbau morgen.", []],
  ["Jürgen Schulz", "nacht", 120, 74, 86, 1, 36.6, 98, "Ruhige Nacht.", "Stabil.", "Hb-Kontrolle morgens.", []],
];
const UHRZEIT = { frueh: [gestern, "13:30"], spaet: [gestern, "21:30"], nacht: [heute, "05:30"] };

const pruefe = (r, was) => {
  if (r.error) throw new Error(`${was}: ${r.error.message}`);
  return r.data;
};

// 1) Mitarbeiter + Dienstplan für heute
const ma = pruefe(
  await sb.from("mitarbeiter").upsert(MITARBEITER.map(([name, personalnummer]) => ({ name, personalnummer })), { onConflict: "personalnummer" }).select("id, personalnummer"),
  "Mitarbeiter",
);
const maId = Object.fromEntries(ma.map((m) => [m.personalnummer, m.id]));
pruefe(await sb.from("dienstplan").delete().lt("datum", gestern), "Alter Dienstplan");
pruefe(
  await sb
    .from("dienstplan")
    .upsert(MITARBEITER.map(([, pnr, schicht, bereich]) => ({ mitarbeiter_id: maId[pnr], datum: heute, schicht, bereich })), {
      onConflict: "mitarbeiter_id,datum,schicht",
    }),
  "Dienstplan",
);

// 2) Patienten (anlegen falls fehlend, Aufnahmedatum relativ zu heute)
const vorhanden = pruefe(await sb.from("patients").select("id, name"), "Patienten");
const patId = Object.fromEntries(vorhanden.map((p) => [p.name, p.id]));
for (const [name, alter, geschlecht, zimmer, bereich, diagnose, aufnahme] of PATIENTEN) {
  const zeile = { name, alter, geschlecht, zimmer, bereich, diagnose, aufnahme_datum: tag(aufnahme) };
  if (patId[name]) pruefe(await sb.from("patients").update(zeile).eq("id", patId[name]), `Patient ${name}`);
  else patId[name] = pruefe(await sb.from("patients").insert(zeile).select("id").single(), `Patient ${name}`).id;
}

// 3) Alle Übergaben löschen (Messwerte, Warnungen, Aufgaben gehen per Cascade mit)
const geloescht = pruefe(await sb.from("handovers").delete().not("id", "is", null).select("id"), "Übergaben löschen");

// 4) Verlauf von gestern neu einspielen
for (const [name, schicht, sys, dia, puls, schmerz, temp, spo2, situation, assessment, recommendation, highlights] of VERLAUF) {
  const [datum, hhmm] = UHRZEIT[schicht];
  const ts = zeit(datum, hhmm);
  const diagnose = PATIENTEN.find((p) => p[0] === name)[5];
  const h = pruefe(
    await sb
      .from("handovers")
      .insert({
        patient_id: patId[name],
        datum: gestern,
        schicht,
        situation,
        background: diagnose,
        assessment,
        recommendation,
        highlights,
        status: "uebernommen",
        bestaetigt_am: ts,
        uebernommen_am: new Date(new Date(ts).getTime() + 30 * 60e3).toISOString(),
      })
      .select("id")
      .single(),
    `Übergabe ${name}`,
  );
  pruefe(
    await sb.from("vitals").insert(
      [
        ["blutdruck", sys, dia],
        ["puls", puls, null],
        ["schmerz", schmerz, null],
        ["temperatur", temp, null],
        ["spo2", spo2, null],
      ].map(([typ, wert, wert2]) => ({ patient_id: patId[name], handover_id: h.id, zeitpunkt: ts, typ, wert, wert2 })),
    ),
    `Messwerte ${name}`,
  );
}

console.log(`Demo zurückgesetzt für ${heute}: ${geloescht.length} Übergaben gelöscht, ${VERLAUF.length} Verlaufs-Übergaben neu (gestern), Dienstplan für heute gesetzt.`);
