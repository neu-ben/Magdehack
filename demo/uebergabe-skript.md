# Demo-Skript: Übergabe Frühdienst → Spätdienst, Flur A

Passt zu den Testdaten in Supabase (Projekt "Hackathon").
Anmelden als **Anna Richter (P-1023)**, Frühdienst Flur A. Übernimmt: **Ben Krause (P-1047)**, Spätdienst Flur A.

## Zum Vorlesen (ca. 90 Sekunden)

Zimmer drei, Herr Schneider, Pneumonie. Deutlich besser heute. Temperatur siebenunddreißig komma zwei, Sättigung sechsundneunzig Prozent mit einem Liter Sauerstoff. Blutdruck hundertzwanzig zu fünfundsiebzig, Puls achtzig. Schmerzen eins. War heute zweimal mit Physio auf dem Flur. Sauerstoff kann eventuell heute Nachmittag ganz weg.

Zimmer vier, Frau Müller. Blutdruck heute Morgen hundertzweiundsiebzig zu achtundneunzig, Puls achtundachtzig. Sie klagt über Kopfschmerzen, Schmerzen vier von zehn. Hat ihre Tabletten genommen. Ist etwas schwindelig beim Aufstehen.

Zimmer fünf, Frau Becker. Hat heute Vormittag etwa sechshundert Milliliter getrunken, Infusion läuft weiter. Blutdruck hundertzwanzig zu siebzig, Puls achtundsiebzig. Nachts war sie wieder unruhig, Klingel liegt in Reichweite. Tochter kommt heute Nachmittag zu Besuch.

Zimmer sechs, Herr Wagner. Blutzucker vor dem Mittagessen hundertzweiundvierzig. Blutdruck hundertvierundzwanzig zu achtundsiebzig, Puls hundertsechs, unregelmäßig wie bekannt. Keine Schmerzen. Diabetesberatung ist für morgen angemeldet.

Zimmer sieben, Herr Krüger, Neuaufnahme heute früh mit Brustschmerzen. Blutdruck hundertachtunddreißig zu sechsundachtzig, Puls zweiundneunzig, Schmerzen drei. Troponin-Kontrolle um sechzehn Uhr steht noch aus. EKG ist geschrieben.

## Was der Agent finden soll

| Patient | Erwartung |
|---|---|
| Müller (Zi. 4) | 🔴 **Blutdruck-Trend:** 138/84 → 149/88 → 158/92 → **172/98**, dazu Kopfschmerzen und Schwindel → Arzt informieren |
| Schneider (Zi. 3) | Besserung: Fieber 38,9 → 37,2 °C, Sättigung steigt. Kein Alarm |
| Becker (Zi. 5) | 🟡 Sturzrisiko, Trinkmenge. 🔵 Tochter kommt. **Schmerzwert fehlt** → gelbes Pflichtfeld |
| Wagner (Zi. 6) | Puls 106, aber **bekanntes Vorhofflimmern** → Agent soll das begründet einordnen, nicht rot |
| Krüger (Zi. 7) | **Neuaufnahme, kein Verlauf.** 🟡 Troponin-Kontrolle 16 Uhr als Aufgabe |

## Optional: "Nicht zugeordnet" zeigen

Am Ende anhängen:

> Ach, und Frau Hoffmann aus Zimmer acht hat nach dir gefragt.

Frau Hoffmann liegt auf **Flur B**, gehört also nicht zu Annas Bereich → Meldung "Nicht zugeordnet".
