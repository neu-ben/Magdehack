# Demo-Ablauf: Otti – Sprach-Übergabe für die Pflege

Live-Demo, etwa 5 Minuten (Kurzfassung mit 3 Minuten am Ende).
Story: **Anna** arbeitet ihren Frühdienst auf Flur A ab und übergibt per Sprache an **Ben** vom Spätdienst.
Flur A hat 2 Patientinnen: **Frau Müller (Zi. 4)** und **Frau Becker (Zi. 5)**.

---

## Vorbereitung (vor jeder Probe und direkt vor der Präsentation)

- [ ] `npm run demo:reset` ausführen. Das Skript setzt Dienstplan, Verlauf von gestern, Übergaben, Notizen und eigene Aufgaben zurück und legt Annas Notiz „Becker 11:30“ an.
- [ ] Der Dev-Server läuft (`npm run dev`), Chrome ist auf `http://localhost:3000` geöffnet.
- [ ] Das Mikrofon ist für localhost freigegeben: einmal kurz auf den Mikro-Knopf tippen und erlauben.
- [ ] Das Modell ist in `.env.local` eingestellt: `CLAUDE_MODEL` für die Übergabe, Sonnet ist schneller und Opus gründlicher. `CLAUDE_OTTI_MODEL` gilt für den Chat.
- [ ] Browser-Zoom so einstellen, dass die App-Spalte gut lesbar ist. Andere Tabs und Benachrichtigungen schließen.
- [ ] Dieses Dokument zum Mitlesen auf einem zweiten Bildschirm oder ausgedruckt bereithalten.

---

## 1. Problem (30 s)

> „Bei jedem Schichtwechsel übergibt eine Pflegekraft mündlich oder auf Zetteln. Dabei geht etwas verloren: Werte, Trends, offene Aufgaben. Otti macht daraus eine strukturierte Übergabe. Die Pflegekraft spricht einfach, und Otti denkt mit.“

---

## 2. Schichtbeginn: Anna übernimmt (30 s)

1. Auf der Startseite **Anna Richter (P-1023)** wählen.
   > „Login ist ein Mock-up. Schicht und Flur kommen aus dem Dienstplan, im echten Haus z. B. aus SAP.“
2. Das Popup **„Übergabe vom Nachtdienst“** erscheint, das Kritische steht oben:
   - 🔴 Becker: nachts allein aufgestanden, Sturzrisiko
   - 🟡 Müller: Blutdruck steigt
3. Eine Zeile aufklappen, um Verlauf und Aufgaben zu zeigen. Dann **„Alles gesichtet, übernehmen“**.

---

## 3. Meine Schicht (20 s)

1. Den Pfad zeigen: Zusammenfassung ✓ → **Versorgen** → Übergabe → Feierabend.
2. Auf **„Im Blick behalten“** hinweisen, dort stehen die angepinnten kritischen Hinweise.
3. Bei Becker **„Trinkprotokoll weiterführen“** abhaken.
4. Bei Müller **„Blutdruck vor dem Frühstück messen“ (07:00) bewusst offen lassen**. Die Aufgabe ist rot als **überfällig** markiert.
   > „Das lasse ich absichtlich offen. Mal sehen, ob Otti es merkt.“

---

## 4. Während der Schicht: mit Otti reden (60 s)

1. Unten auf den Tab **Otti** tippen. Die vorbereitete Notiz ist schon da: *Becker 11:30 – Mittagessen kaum angerührt, wirkt müde.*
2. Den Mikro-Knopf antippen und sprechen:
   > „Frau Müller klagt seit dreizehn Uhr über Kopfschmerzen.“

   Stopp, dann **Senden**. Otti antwortet mit „Notiert für Müller, Zi. 4“, die Notiz-Karte zeigt einen Patienten-Chip.
3. Sprechen:
   > „Erinnere mich um sechzehn Uhr bei Frau Becker den Blutdruck nachzumessen.“

   Es erscheint die Karte **„Aufgabe angelegt · 16:00 · Becker“** mit Rückgängig-Knopf.
4. Eine Frage stellen:
   > „Wie war der Blutdruck von Frau Müller?“

   Otti nennt den Trend mit Zahlen und fragt „Arzt informieren?“.
   > „Otti antwortet nur aus den Daten meines Flurs und stellt keine Diagnosen.“
5. *Optional:* „Frau Hoffmann hat Fieber.“ Hoffmann liegt auf Flur B, Otti speichert nichts und verweist auf die zuständige Pflegekraft.

---

## 5. Schichtende: Übergabe einsprechen (90 s)

1. Den Tab **Schicht** antippen. Die Aufgabe von 16:00 steht jetzt als **„eigene“** in der Liste, die Notizen stehen darunter.
2. **„Schicht beenden & Übergabe einsprechen“** antippen. Otti meldet, dass noch Aufgaben offen sind. **„Trotzdem zur Übergabe“**.
3. Kurz auf den Bildschirm zeigen:
   - **Flur-Übersicht:** Die Kacheln zeigen, wer schon besprochen ist und wie viele Notizen es gibt.
   - **„Deine Notizen (2)“:** Otti baut sie ein, man muss sie nicht wiederholen.
4. Den Mikro-Knopf antippen und den Text unten vorlesen. Die Kacheln springen dabei live auf „erwähnt“. Danach **„An Otti geben“**.
   > „Otti teilt die Übergabe nach Patienten auf. Pro Patient wertet ein Helfer-Otter parallel aus: neue Werte gegen den Verlauf, Normwerte mit Alter und Diagnose, Notizen und offene Aufgaben.“
   (Das dauert etwa 20–30 Sekunden. Die Live-Schritte zeigen, was Otti gerade tut.)
5. Die Entwürfe durchgehen, siehe Tabelle **„Was Otti finden soll“** weiter unten:
   - **Müller:** 🔴 Blutdruck-Trend bis 172/98, Kopfschmerzen seit 13 Uhr aus der Notiz, Hinweis „07:00 nicht abgehakt – erledigt?“
   - **Becker:** Der **Schmerzwert fehlt** und ist gelb markiert. Einen Wert eintragen oder „nicht erhoben“ wählen. Die Notiz zum Mittagessen und die Aufgabe von 16:00 sind übernommen.
   > „Human in the Loop: Nichts gilt, bevor die Pflegekraft bestätigt. Alles lässt sich direkt auf der Karte ändern oder für einen Patienten neu einsprechen.“
6. Beide Entwürfe **bestätigen**. Otti freut sich: **„Übergabe fertig!“**

---

## 6. Ben übernimmt (30 s)

1. Oben links auf **AR** tippen und **Abmelden** wählen.
2. **Ben Krause (P-1047)** wählen. Das Popup zeigt Annas Übergabe, Müllers rote Warnung steht oben, die offenen Aufgaben sind dabei.
   > „Der Kreis schließt sich: Was Anna gesprochen hat, kommt bei Ben strukturiert an, Kritisches zuerst.“
3. **Übernehmen**.

---

## 7. Ausblick (30 s)

- Anbindung an Klinik-Systeme (FHIR, SAP) statt Demo-Datenbank.
- Spracherkennung vor Ort statt im Browser, für den Datenschutz.
- Version fürs Handy oder die Kitteltasche, Otti als Begleiter über die ganze Schicht.

---

## Zum Vorlesen (Übergabe, ca. 40 s)

> Zimmer vier, Frau Müller. Blutdruck heute Morgen hundertzweiundsiebzig zu achtundneunzig, Puls achtundachtzig. Sie klagt über Kopfschmerzen, Schmerzen vier von zehn. Hat ihre Tabletten genommen. Ist etwas schwindelig beim Aufstehen.
>
> Zimmer fünf, Frau Becker. Hat heute Vormittag etwa sechshundert Milliliter getrunken, Infusion läuft weiter. Blutdruck hundertzwanzig zu siebzig, Puls achtundsiebzig. Nachts war sie wieder unruhig, Klingel liegt in Reichweite. Tochter kommt heute Nachmittag zu Besuch.

*Optional anhängen, um „Nicht zugeordnet“ zu zeigen:* „Ach, und Frau Hoffmann aus Zimmer acht hat nach dir gefragt.“ Hoffmann liegt auf Flur B, es erscheint eine gelbe Karte mit Auswahlliste.

## Was Otti finden soll

| Patient | Erwartung |
|---|---|
| Müller (Zi. 4) | 🔴 Blutdruck-Trend 138/84 → 149/88 → 158/92 → **172/98** mit Kopfschmerz (seit 13 Uhr, aus der Notiz) und Schwindel, Arzt informieren? Erinnerung an die **nicht abgehakte Kontrolle um 07:00** |
| Becker (Zi. 5) | 🟡 Sturzrisiko, Trinkmenge, Mittagessen kaum angerührt (Notiz 11:30). Blutdruck nachmessen um 16:00 als Aufgabe für den Spätdienst. 🔵 Tochter kommt. **Schmerzwert fehlt**, gelbes Pflichtfeld |

---

## Wenn etwas schiefgeht

| Problem | Ausweg |
|---|---|
| Mikro erkennt nichts oder es fehlt die Freigabe | In der Übergabe **„Beispieltext“** antippen. Im Otti-Chat den Text eintippen |
| Popup erscheint nicht | `npm run demo:reset` vergessen: ausführen und die Seite neu laden |
| Otti braucht lange oder meldet einen Fehler | Nochmal „An Otti geben“. Ein einzelner Patient lässt sich auf seiner Karte neu einsprechen |
| Falsche Zuordnung einer Notiz | Auf den Patienten-Chip tippen und ändern, oder die Notiz löschen |
| Komplett festgefahren | `npm run demo:reset`, abmelden, mit Anna neu starten |

## Kurzfassung (3 Minuten)

Schritt 1 sehr knapp halten. In Schritt 4 nur die Notiz und die Erinnerung zeigen, ohne Frage. Aus Schritt 6 nur einen Satz machen: „Ben sieht beim Anmelden genau diese Übergabe.“ Schritt 7 weglassen.
