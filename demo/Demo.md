# Demo-Ablauf: Otti live in 2 Minuten

Teil des Pitches (insgesamt höchstens 3 Minuten, siehe [Pitch.md](../Pitch.md)).
Story: **Anna** übernimmt den Frühdienst auf Flur A, arbeitet ihre Schicht ab und übergibt per Sprache.
Flur A hat 2 Patientinnen: **Frau Müller (Zi. 4)** und **Frau Becker (Zi. 5)**.

Gemessene Wartezeiten mit Sonnet 5.5: Otti-Chat etwa **3–4 s**, Übergabe-Auswertung etwa **16 s**. Mit Opus dauert die Auswertung etwa 25–30 s. Für die 2 Minuten nimm **Sonnet**.

---

## Vorbereitung (direkt vor dem Pitch)

- [ ] `npm run demo:reset` ausführen. Das setzt alle Daten zurück und legt Annas Notiz „Becker 11:30“ an.
- [ ] Der Dev-Server läuft, Chrome ist auf `http://localhost:3000` geöffnet, die Startseite ist zu sehen.
- [ ] In `.env.local` steht `CLAUDE_MODEL=claude-sonnet-5-5`.
- [ ] Das Mikrofon ist für localhost freigegeben: einmal antippen und erlauben.
- [ ] Die Folien sind in einem zweiten Fenster geöffnet, Folie 3 ist bereit.
- [ ] Einmal mit der Stoppuhr geprobt.

---

## Ablauf mit Zeitplan

| Zeit | Was du tust | Was du sagst |
|---|---|---|
| **0:00–0:15** | **Anna Richter** antippen. Im Popup kurz auf die rote Warnung bei Becker zeigen, dann **„Alles gesichtet, übernehmen“** | „Anna beginnt ihren Frühdienst. Otti zeigt zuerst, was in der Nacht passiert ist, Kritisches oben.“ |
| **0:15–0:25** | In Meine Schicht **„Trinkprotokoll“** abhaken. Auf die rote **07:00 „überfällig“** bei Müller zeigen, **nicht** abhaken | „Aufgaben hake ich ab. Die Blutdruck-Kontrolle lasse ich bewusst offen.“ |
| **0:25–0:45** | Tab **Otti**, Mikro antippen und sprechen (Satz A), Stopp, **Senden** | Otti bestätigt mit „Notiert für Müller … Aufgabe angelegt: 16:00 Becker“ |
| **0:45–0:55** | Tab **Schicht**, **„Schicht beenden & Übergabe einsprechen“**, dann **„Trotzdem zur Übergabe“** | „Schichtende. Otti zeigt mir den Flur und meine Notizen.“ |
| **0:55–1:12** | Mikro antippen und Satz B vorlesen, Stopp, **„An Otti geben“** | (vorlesen) |
| **1:12–1:30** | Warten, etwa 16 s | „Otti trennt nach Patienten. Für jede Patientin wertet ein Helfer-Otter parallel aus: Verlauf, Normwerte mit Alter und Diagnose, meine Notizen und offene Aufgaben.“ |
| **1:30–1:50** | **Müller:** auf die rote Warnung zeigen. **Becker:** beim fehlenden Schmerzwert **„nicht erhoben“**. Beide **Bestätigen** | „Blutdruck-Trend über vier Schichten, die Kopfschmerzen aus meiner Notiz sind drin, die offene 07:00-Kontrolle auch. Bei Becker fehlt der Schmerzwert, Otti markiert ihn gelb. Nichts gilt, bevor ich bestätige.“ |
| **1:50–2:00** | **„Übergabe fertig!“** erscheint | „Und Ben vom Spätdienst sieht beim Anmelden genau diese Übergabe, Kritisches zuerst.“ |

**Nur wenn du vor 1:45 fertig bist:** Oben auf **AR**, dann **Abmelden** und **Ben Krause** wählen. Das Popup mit Annas Übergabe zeigen. Das dauert etwa 10 s.

---

## Sprechtexte

**Satz A, an Otti (etwa 7 s):**
> Frau Müller klagt seit dreizehn Uhr über Kopfschmerzen. Und erinnere mich um sechzehn Uhr bei Frau Becker den Blutdruck nachzumessen.

**Satz B, die Übergabe (etwa 15 s):**
> Zimmer vier, Frau Müller: Blutdruck hundertzweiundsiebzig zu achtundneunzig, Puls achtundachtzig, Schmerzen vier von zehn, Kopfschmerzen und Schwindel beim Aufstehen.
> Zimmer fünf, Frau Becker: sechshundert Milliliter getrunken, Blutdruck hundertzwanzig zu siebzig, Puls achtundsiebzig. Die Tochter kommt am Nachmittag.

Satz B steckt auch hinter dem Knopf **„Beispieltext“** auf der Übergabe-Seite, falls das Mikro streikt.

## Was Otti finden soll (im Test so bestätigt)

| Patientin | Erwartung |
|---|---|
| Müller (Zi. 4) | 🔴 Blutdruck 138 → 149 → 158 → **172** mmHg, steigend über 4 Messungen, dazu Kopfschmerzen seit 13 Uhr (aus der Notiz) und Schwindel. Hinweis auf die offene Kontrolle um 07:00 |
| Becker (Zi. 5) | Trinkmenge rückläufig (900 → 600 ml), Mittagessen kaum gegessen (Notiz 11:30), Nachmessen um 16:00 nicht abgehakt. **Schmerzwert fehlt**, gelbes Pflichtfeld |

---

## Wenn etwas schiefgeht

| Problem | Ausweg (kostet etwa) |
|---|---|
| Mikro erkennt nichts | Bei Otti Satz A eintippen. In der Übergabe **„Beispieltext“** antippen (5 s) |
| Popup erscheint nicht | `demo:reset` vergessen. Ohne Popup weitermachen und das Popup nur erwähnen |
| Otti braucht lange oder meldet einen Fehler | Einmal nochmal „An Otti geben“. Danach Otti-Schritt weglassen und mit Übergabe weitermachen |
| Zeit läuft davon | Den Otti-Schritt (0:25–0:45) streichen, die Notiz von 11:30 ist trotzdem im Entwurf |
