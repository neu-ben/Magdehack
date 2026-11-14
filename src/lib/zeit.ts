// Zeit-Helfer, auch im Browser nutzbar (deutsche Zeit, unabhängig von der Zeitzone des Geräts)

/** Uhrzeit HH:MM */
export function uhrzeit(iso: string | Date): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Minuten seit Mitternacht aus "07:00" / "7 Uhr" / "16.30", sonst null (z. B. "vor dem Frühstück") */
export function faelligMinuten(faellig: string | null): number | null {
  const m = faellig?.match(/^\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr)?\s*$/i);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

/** Aktuelle Minuten seit Mitternacht in deutscher Zeit */
export function jetztMinuten(): number {
  const [h, m] = uhrzeit(new Date()).split(":").map(Number);
  return h * 60 + m;
}
