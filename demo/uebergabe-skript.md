> **Veraltet:** Der aktuelle 2-Minuten-Ablauf mit kürzerem Vorlesetext steht in [Demo.md](../pitch/Demo.md).

# Demo-Skript: Übergabe Frühdienst → Spätdienst, Flur A

Passt zu den Testdaten in Supabase (Projekt "Hackathon"). Flur A hat **2 Patienten**: Frau Müller (Zi. 4) und Frau Becker (Zi. 5).

**Vor jeder Probe und vor der Präsentation:** `npm run demo:reset`
Löscht alle Übergaben und spielt den Verlauf (gestern Früh/Spät/Nacht) und den Dienstplan passend zum heutigen Datum neu ein.
Nur die offene Nachtschicht (ohne Verlauf davor): `npm run demo:nacht`

## Ablauf

1. Anmelden als **Anna Richter (P-1023)**, Frühdienst Flur A → Popup "Übergabe vom Nachtdienst" → **Alles gesichtet, übernehmen**
2. "Meine Schicht": z. B. **Trinkprotokoll** bei Frau Becker abhaken, die **Blutdruck-Kontrolle 07:00** bei Frau Müller bewusst offen lassen
3. **Schicht beenden & Übergabe einsprechen** → Text unten vorlesen → **An Otti geben** → Entwürfe prüfen und bestätigen
4. Abmelden, anmelden als **Ben Krause (P-1047)**, Spätdienst Flur A → Popup mit Annas Übergabe → übernehmen

## Zum Vorlesen (ca. 40 Sekunden)

Zimmer vier, Frau Müller. Blutdruck heute Morgen hundertzweiundsiebzig zu achtundneunzig, Puls achtundachtzig. Sie klagt über Kopfschmerzen, Schmerzen vier von zehn. Hat ihre Tabletten genommen. Ist etwas schwindelig beim Aufstehen.

Zimmer fünf, Frau Becker. Hat heute Vormittag etwa sechshundert Milliliter getrunken, Infusion läuft weiter. Blutdruck hundertzwanzig zu siebzig, Puls achtundsiebzig. Nachts war sie wieder unruhig, Klingel liegt in Reichweite. Tochter kommt heute Nachmittag zu Besuch.

## Was der Agent finden soll

| Patient | Erwartung |
|---|---|
| Müller (Zi. 4) | 🔴 **Blutdruck-Trend:** 138/84 → 149/88 → 158/92 → **172/98**, dazu Kopfschmerzen und Schwindel → Arzt informieren. Erinnert an die **nicht abgehakte Blutdruck-Kontrolle 07:00** |
| Becker (Zi. 5) | 🟡 Sturzrisiko, Trinkmenge. 🔵 Tochter kommt. **Schmerzwert fehlt** → gelbes Pflichtfeld |

## Optional: "Nicht zugeordnet" zeigen

Am Ende anhängen:

> Ach, und Frau Hoffmann aus Zimmer acht hat nach dir gefragt.

Frau Hoffmann liegt auf **Flur B**, gehört also nicht zu Annas Bereich → Meldung "Nicht zugeordnet".
