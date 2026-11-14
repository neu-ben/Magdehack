# Otti – Sprach-Übergabe für die Pflege

Prototyp vom MagdeHack 2026: Eine Pflegekraft spricht die Schichtübergabe einfach ein.
Otti, der Otter, sortiert nach Patienten, schreibt SBAR-Entwürfe mit Messwerten, Trends
und Warnungen – und nichts gilt, bevor die Pflegekraft bestätigt.

## Starten

```bash
npm install
cp .env.example .env.local   # Schlüssel eintragen (Supabase + Anthropic)
npm run demo:reset           # Demo-Daten relativ zum heutigen Datum einspielen
npm run dev                  # http://localhost:3000 in Chrome öffnen
```

Spracheingabe nutzt die Web Speech API und funktioniert in Chrome; tippen geht überall.

## Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run demo:reset` | Alles zurücksetzen: Dienstplan heute, Verlauf von gestern, Notizen, Demo-Notiz für Anna |
| `npm run demo:nacht` | Nur die offene Nachtschicht neu einspielen (Übergabe an den Frühdienst) |
| `npm run lint` / `npx tsc --noEmit` | Prüfen |

## Demo & Pitch

- [pitch/Pitch.md](pitch/Pitch.md) – Sprechtext, höchstens 3 Minuten
- [pitch/Demo.md](pitch/Demo.md) – Klick-Ablauf der 2-Minuten-Live-Demo
- [pitch/praesentation.html](pitch/praesentation.html) – Folien (im Browser öffnen, Pfeiltasten blättern, F = Vollbild)
- [plan.md](plan.md) – alle Entscheidungen aus der Planung

## Aufbau

- `src/app` – Seiten: `/` Login (Mock-up), `/schicht` Meine Schicht, `/schicht/uebergabe` Sprachübergabe, `/otti` Chat, `/board` Übersicht; API-Routen unter `src/app/api`
- `src/lib/agent.ts` – Übergabe-Agent: Transkript aufteilen, pro Patient parallel auswerten (Claude, Structured Outputs)
- `src/lib/otti.ts` – Otti-Chat: Notizen, Fragen, eigene Aufgaben in einem Aufruf
- `src/lib/vitals-config.ts` – Normwerte mit Kulanzzone, neue Vitaltypen hier ergänzen
- `scripts/demo-reset.mjs` – Demo-Daten (Supabase), immer relativ zu heute

Modelle über `.env.local`: `CLAUDE_MODEL` (Übergabe) und `CLAUDE_OTTI_MODEL` (Chat).
