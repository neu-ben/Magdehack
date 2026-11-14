# Pitch: Otti – Sprach-Übergabe für die Pflege

Etwa 2 Minuten, rund 280 Wörter. Die Folien liegen in [pitch/praesentation.html](pitch/praesentation.html). Du blätterst mit den Pfeiltasten oder der Leertaste, mit **F** wird es Vollbild.
Die Live-Demo kommt danach, siehe [Demo.md](Demo.md).

---

### Folie 1 · Titel (10 s)

> Hallo, ich bin Benny. Das ist **Otti**, ein Otter mit Pflegehaube. Otti hilft Pflegekräften bei der Schichtübergabe, und zwar per Sprache.

### Folie 2 · Problem (25 s)

> Auf einer Station wechselt die Schicht dreimal am Tag. Jedes Mal muss alles Wichtige von einer Pflegekraft zur nächsten: Blutdruck, Schmerzen, offene Aufgaben, Angehörige.
> Das passiert heute oft mündlich, unter Zeitdruck und mit Zettel in der Kitteltasche. Dabei geht etwas verloren. Vor allem **Trends** sieht niemand, wenn jeder nur seine eigene Schicht kennt.

### Folie 3 · Lösung (25 s)

> Mit Otti spricht die Pflegekraft die Übergabe einfach am Stück ein, für den ganzen Flur.
> Otti sortiert nach Patienten und schreibt pro Patient einen Entwurf im SBAR-Schema. Dabei vergleicht Otti die Werte mit den letzten Schichten und markiert, was kritisch ist.
> Wichtig: **Nichts gilt, bevor die Pflegekraft bestätigt.**

### Folie 4 · Die Schicht mit Otti (20 s)

> Otti begleitet die ganze Schicht. Zu Beginn kommt eine Zusammenfassung, Kritisches steht oben. Während der Schicht hakt man Aufgaben ab und spricht Otti kurze Notizen ein. Am Ende kommt die Übergabe, und die fließt direkt in die Zusammenfassung der nächsten Schicht.

### Folie 5 · Was Otti erkennt (20 s)

> Ein Beispiel: Bei Frau Müller steigt der Blutdruck seit vier Schichten, von 138 auf 172. Otti zeigt das als Trend mit Zahlen und fragt: Arzt informieren?
> Otti merkt auch, wenn eine Aufgabe nicht abgehakt wurde oder ein Pflichtwert fehlt. Otti fragt aber nicht nach, sondern markiert das Feld gelb.

### Folie 6 · Sicher & gebaut (15 s)

> Otti sieht nur den eigenen Flur aus dem Dienstplan und stellt keine Diagnosen. Gebaut habe ich das heute mit Next.js, Supabase und Claude. Mehrere „Helfer-Otter“ werten die Patienten parallel aus, in etwa zwanzig Sekunden.

### Folie 7 · Ausblick (10 s)

> Als Nächstes: Anbindung an Klinik-Systeme über FHIR oder SAP, Spracherkennung vor Ort für den Datenschutz und eine Version fürs Handy.

### Folie 8 · Schluss (10 s)

> Seeotter halten sich beim Schlafen an den Pfoten, damit keiner wegtreibt. Genau das soll eine Übergabe leisten: **Niemand geht verloren.**
> Und jetzt zeige ich euch Otti live.

---

## Tipps

- **Zeit:** Die Angaben ergeben etwa 2:15. Wird es knapp, kürze Folie 6 auf „Gebaut mit Next.js, Supabase und Claude“.
- **Pausen:** Nach „Trends sieht niemand“ und nach „Niemand geht verloren“ kurz stehen lassen.
- **Zahlen:** Im Pitch stehen nur Zahlen aus der eigenen Demo (Blutdruck-Trend, etwa 20 s Auswertung). Wenn du Studienzahlen zu Übergabefehlern nennen willst, nur mit Quelle.
- **Übergang zur Demo:** Auf der letzten Folie bleiben, dann mit Alt+Tab in den Browser mit der App wechseln, `demo:reset` ist vorher gelaufen.
