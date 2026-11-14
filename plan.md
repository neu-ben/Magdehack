# MagdeHack – Plan: Sprach-Übergabe für die Pflege

## Idee in einem Satz
Beim Schichtwechsel spricht die Pflegekraft die Übergabe der ganzen Station am Stück ein. Ein KI-Agent teilt sie nach Patienten auf, legt pro Patient eine Zusammenfassung mit hervorgehobenen wichtigen Punkten an, erkennt Trends über mehrere Schichten und schlägt Warnungen und Aufgaben vor. Gespeichert wird erst, wenn ein Mensch bestätigt hat.

## Problem
- Die Übergabe kostet jede Schicht Zeit und läuft oft mündlich oder auf Zetteln.
- Informationen gehen verloren, schleichende Verschlechterungen fallen über mehrere Schichten hinweg niemandem auf.
- Dokumentieren ist Zusatzarbeit nach der eigentlichen Pflege.
- TODO Pitch: 1–2 belastbare Zahlen mit Quelle recherchieren (Zeitaufwand Übergabe, Fehler durch Kommunikation).

## Zielgruppe
Pflegekräfte auf einer Station der **Inneren Medizin**: die abgebende und die übernehmende Pflegekraft.

## Entscheidungen
| Thema | Entscheidung |
|---|---|
| Aufnahme | **Ziel:** eine Aufnahme für die ganze Station. Der Agent trennt die Patienten selbst. Konvention: Das Personal nennt **immer Name oder Zimmernummer**, bevor es über einen Patienten spricht. **Bau-Reihenfolge:** zuerst eine Aufnahme pro Patient, dann auf eine Aufnahme am Stück erweitern. |
| Mensch bestätigt | **Immer.** Der Agent erstellt Entwürfe, gespeichert wird erst nach Bestätigung. |
| Zusammenfassung | Pro Patient eine Karte, auf der **wichtige Punkte direkt hervorgehoben** sind, damit man schnell einen Überblick bekommt. |
| Messwerte | Die KI holt Messwerte heraus und speichert sie **strukturiert als Zahlen**. |
| Trends | Die **KI erkennt Trends** anhand der gespeicherten Messwertreihen der letzten Schichten. |
| Station | Innere Medizin |
| Gerät | Laptop mit Chrome, Anzeige auf dem Laptop/Beamer |
| Modell | **Opus 5.5** für die Auswertung, über eine Konfiguration austauschbar (z. B. `CLAUDE_MODEL` in `.env.local`) |
| Nicht zuordenbar | Kann der Agent einen Abschnitt keinem Patienten zuordnen, bekommt die Pflegekraft eine **Meldung**. Sie ordnet ihn manuell per **Dropdown** zu. Nichts wird still falsch zugeordnet. |
| Hervorhebungen | Drei feste Stufen: 🔴 **Kritisch** (Messwert außerhalb des Bereichs, Verschlechterung, Sturz, Arzt informieren) · 🟡 **Beachten** (neue/geänderte Medikamente, Schmerzen, offene Untersuchungen, Ernährung/Flüssigkeit) · 🔵 **Info** (Angehörige, geplante Entlassung, Organisatorisches) |
| Normalwerte | **Feste Tabelle** im Code mit allgemeinen Werten für Erwachsene und drei Zonen pro Messwert: normal, **Kulanzbereich** (grenzwertig → gelb), kritisch (→ rot). Die Tabelle ist nur die **Grundlage**: Der Agent liest aus dem **Kontext** (Alter, Diagnose, bisheriger Verlauf), ob ein Wert für **diesen** Patienten auffällig ist, und **begründet** das auf der Karte. Mit den Testdaten prüfen, ob das zuverlässig klappt. Falls nicht: Altersgruppen in die Tabelle aufnehmen. Grenzwerte vor dem Hackathon gegenprüfen. |
| Korrektur | **Beides:** direkt auf der Karte bearbeiten **oder** den Abschnitt eines Patienten neu einsprechen. Neu-Einsprechen ersetzt **nur den Abschnitt dieses Patienten** und wertet nur ihn neu aus. Vorher kommt eine Warnung, dass manuelle Änderungen verloren gehen. |
| Fehlende Werte | Der Agent stellt **keine Rückfragen** im Gespräch. Fehlende Pflichtwerte erscheinen auf der Entwurfskarte als **leeres, gelb markiertes Feld** („⚠ fehlt“). Die Pflegekraft trägt den Wert ein oder wählt „nicht erhoben“. Erst dann lässt sich die Karte bestätigen. |
| Messwert-Arten | Pflicht vorerst: **Blutdruck, Puls, Schmerz**. Optional: Temperatur, Sauerstoffsättigung. Alle Arten stehen in **einer Konfigurationsdatei** (Name, Einheit, Pflicht ja/nein, Grenzwerte). Ein neuer Wert wie Blutzucker ist dort **ein Eintrag**, ohne Änderung an der Datenbank. |
| Neuaufnahmen | Karte zeigt „Neuaufnahme, noch kein Verlauf“. Der Agent bewertet nur die aktuellen Werte. Neue Patienten kommen heute nur über die Testdaten. |
| Schicht | Kommt **automatisch aus dem Dienstplan** der angemeldeten Pflegekraft (Früh/Spät/Nacht + Datum). Daraus ergibt sich die Zeitachse für Trends. Kein Dropdown. |
| Mitarbeiter-Login | Für die Demo ein **Mock-up**: Auswahl „Anmelden als …“ aus einer Liste erfundener Mitarbeiter, ohne Passwort. Ausblick: Anmeldung über das Klinik-Konto (SSO). |
| Dienstplan | **Einfache Tabelle `dienstplan` in Supabase** mit erfundenen Daten. Sie steht stellvertretend für eine externe Quelle wie einen Schichtplan aus SAP. Ausblick: echte Anbindung. **Kein** Zugriff auf das SAP-System oder Daten des Arbeitgebers. |
| Zuständigkeit | **Nach Bereich:** Der Dienstplan sagt „Anna, heute Frühdienst, Flur A“. Welche Patienten auf Flur A liegen, steht in den Patientendaten. |
| Verantwortungsbereich | Die App zeigt und verarbeitet nur die **Patienten, für die die angemeldete Pflegekraft heute verantwortlich ist**. Beim Aufteilen vergleicht der Agent nur mit diesen Patienten. Nennt die Pflegekraft einen anderen Patienten, kommt die Meldung **„Nicht zugeordnet“**. |
| Übernahme | **Direkt nach dem Login als Popup:** Überblick über die vorherige Schicht im eigenen Bereich, kompakt, kritische Hinweise zuerst, pro Patient aufklappbar. **„Alles gesichtet, übernehmen“** übernimmt den ganzen Bereich, danach geht es in die Sprachübergabe. Das Board bleibt als Nachschlage-Ansicht. |
| Demo | **Live einsprechen** mit einem vorbereiteten Übergabe-Skript, das zu den Testdaten passt. Dasselbe Skript liegt als Text bereit, falls das Mikrofon versagt. |

## Otti-Chat: Notizen, Fragen, eigene Aufgaben (Grill-Runde 3)

| Thema | Entscheidung |
|---|---|
| Form | Ein Chat mit Otti (`/otti`, Tab „Otti“, Notiz-Button in Meine Schicht). Otti erkennt Notiz, Frage, eigene Aufgabe und „Aufgabe erledigt“ selbst, auch gemischt in einem Satz |
| Eingabe | Sprechen und Tippen; Mikro startet nur auf Tippen; Otti liest nicht vor |
| Zuordnung | Otti erkennt den Patienten am Nachnamen oder an der Zimmernummer (großzügig, Anrede egal), Chip zum Ändern; ohne Patient = ganzer Flur |
| Patient aus anderem Bereich | Nichts speichern, Hinweis an die zuständige Pflegekraft |
| Speichern | Notizen als Rohtext; Auswertung erst bei der Übergabe (Agent bekommt Notizen und offene eigene Aufgaben als Kontext) |
| Korrigieren | Notizen löschen, nicht bearbeiten; eigene Aufgaben „Rückgängig“ |
| Sichtbarkeit | Notizen nur für die eigene Person und Schicht; weiter geht nur, was in der bestätigten Übergabe steht |
| Fragen | Nur aus den Daten des eigenen Flurs, keine Diagnosen, höchstens „Arzt informieren?“; Fragen/Antworten werden nicht gespeichert |
| Eigene Aufgaben | In der Aufgabenliste in Meine Schicht (Kennzeichen „eigene“), zählen für „Versorgen“; offen gebliebene schlägt der Agent der nächsten Schicht vor |
| Uhrzeit | Keine Erinnerung zur Uhrzeit, nur Markierung „überfällig“ |
| Erledigt melden | Otti schlägt „Aufgabe abhaken?“ vor, abgehakt wird nur auf Tippen |
| Verfügbarkeit | Vor der Übernahme gesperrt; nach bestätigter Übergabe nur Fragen |
| Übergabe-Seite | Aufklappbare Liste „Deine Notizen“, Notizzahl auf den Kacheln; Entwürfe nur für besprochene Patienten, Otti erinnert an Patienten mit Notizen ohne Übergabe |
| Modell | `CLAUDE_OTTI_MODEL`, Standard Sonnet 5.5, ein Aufruf pro Nachricht |
| Demo | `demo:reset` legt die Notiz „Becker 11:30: Mittagessen kaum angerührt, wirkt müde“ für Anna an |

## Kern-Ablauf (das MUSS in der Demo laufen)
0. **Anmelden:** Die Pflegekraft meldet sich an. Die App holt aus dem Schichtplan Schicht und Bereich und lädt nur die Patienten dieses Bereichs.
1. **Aufnehmen:** Die abgebende Pflegekraft startet die Aufnahme und spricht die Übergabe ein. Stufe 1: pro Patient. Stufe 2: alle am Stück.
2. **Transkript:** Text erscheint live während des Sprechens.
3. **Agent arbeitet** sichtbar in Schritten:
   - Er **teilt das Transkript nach Patienten auf** (Stufe 2) und ordnet jeden Abschnitt einem Patienten zu.
   - Er schreibt pro Patient eine **Zusammenfassung nach SBAR** (Situation, Background, Assessment, Recommendation).
   - Er holt die **Messwerte** heraus: Blutdruck, Puls, Temperatur, Sauerstoffsättigung, Schmerz 0–10.
   - Er holt die **Messwertreihen der letzten Schichten** und **erkennt Trends**.
   - Er **hebt wichtige Punkte hervor** und schlägt **Warnungen** (rot/gelb) und **Aufgaben** für die nächste Schicht vor.
4. **Prüfen und bestätigen:** Pro Patient eine Entwurfskarte. Die Pflegekraft prüft, korrigiert bei Bedarf und tippt auf „Bestätigen“. Erst dann wird gespeichert.
5. **Stations-Board:** Die übernehmende Pflegekraft sieht alle Patienten als Karten mit Hervorhebungen, Warnungen, Aufgaben und einem Mini-Verlauf der Messwerte. Sie bestätigt den ganzen Bereich mit „Übernommen“, nachdem sie im Sicherheitsdialog die kritischen Hinweise gesehen hat.

## Abgrenzung (bewusst NICHT im Prototyp)
- Keine echten Patientendaten, nur erfundene Beispielpatienten.
- Keine Anbindung an ein Krankenhaus-Informationssystem. Auf einer Folie als Ausblick zeigen: FHIR oder SAP-Schnittstelle.
- Keine Rollen und Rechte über den Verantwortungsbereich hinaus. Eine Station.
- Keine medizinischen Entscheidungen. Der Agent **weist hin**, die Pflegekraft entscheidet und bestätigt.
- Heute keine Optimierung fürs Handy. Die Anzeige ist für den Laptop gebaut.

## Technik
| Teil | Wahl | Grund |
|---|---|---|
| Framework | Next.js (App Router, TypeScript) | Frontend und API in einem Projekt |
| UI | Tailwind + shadcn/ui, Layout für den Laptop | Demo läuft auf dem Laptop |
| Sprache zu Text | Web Speech API (`de-DE`, Chrome) + **Textfeld als Fallback** | Kostenlos, keine Einrichtung. Fallback sichert die Demo ab |
| Agent | `@anthropic-ai/sdk`, Tool-Use-Schleife mit Streaming, Modell per Konfiguration (Standard `claude-opus-5-5`) | Schritte live sichtbar, Modell austauschbar |
| Daten | Supabase | Historie für die Trend-Erkennung, schon mit Claude Code verbunden |
| Hosting | Vercel | Link für die Jury |

### Agent-Werkzeuge (Tools)
- `list_patients()`: nur die Patienten im **Verantwortungsbereich der angemeldeten Pflegekraft** (Name, Zimmer), damit Abschnitte zugeordnet werden können
- `get_patient(id)`: Stammdaten und Diagnose
- `get_vitals_history(id, n)`: Messwerte der letzten n Schichten für die Trend-Erkennung
- `get_recent_handovers(id, n)`: letzte n bestätigte Übergaben
- `propose_handover(id, sbar, vitals, highlights, warnings, tasks)`: Entwurf für einen Patienten anlegen. Wird erst nach Bestätigung durch den Menschen endgültig gespeichert.

### Datenmodell (grob)
- `patients`: id, name (erfunden), alter, zimmer, **bereich**, diagnose
- `mitarbeiter`: id, name (erfunden), personalnummer
- `dienstplan`: id, mitarbeiter_id, datum, schicht (frueh/spaet/nacht), bereich
- `handovers`: id, patient_id, schicht, zeitpunkt, transkript_abschnitt, situation, background, assessment, recommendation, highlights, status (entwurf/bestaetigt/uebernommen), bestaetigt_am
- `vitals`: id, patient_id, handover_id, zeitpunkt, **typ**, wert, wert2 (z. B. diastolischer Blutdruck), status (gemessen/nicht_erhoben). Eine Zeile pro Messwert, damit neue Arten ohne Änderung an der Datenbank dazukommen.
- `warnings`: id, patient_id, handover_id, level, text, erledigt
- `tasks`: id, patient_id, handover_id, text, faellig, erledigt

### Testdaten
Mindestens 2 Bereiche (Flur A, Flur B) und 3–4 erfundene Mitarbeiter mit Dienstplan-Einträgen **für das Demo-Datum**, darunter eine abgebende und eine übernehmende Pflegekraft für denselben Flur. 5–6 erfundene Patienten der Inneren Medizin auf diesen Fluren mit jeweils 2–3 früheren Übergaben und Messwerten. Mindestens **ein eingebauter Trend**, den der Agent finden soll, zum Beispiel ein Blutdruck, der über 3 Schichten steigt. Dazu ein vorbereitetes Demo-Transkript für die ganze Station.

## Zeitplan (12 h)
| Zeit | Schritt | Fertig, wenn |
|---|---|---|
| 0:00–0:45 | Projekt anlegen, auf Vercel deployen, Supabase-Tabellen und Testdaten | Leere App ist online, Daten liegen in der DB |
| 0:45–1:15 | Login-Mock-up, Dienstplan lesen, Patientenliste nach Bereich gefiltert | Nach dem Anmelden erscheinen nur die eigenen Patienten |
| 1:15–3:00 | Agent im Backend für **einen** Patienten: SBAR, Messwerte, Hervorhebungen. Eingabe zuerst als Text | Text rein, Entwurf mit Messwerten raus |
| 3:00–4:30 | Trend-Erkennung, Warnungen, Aufgaben | Agent findet den eingebauten Trend |
| 4:30–6:00 | Aufnahme-Seite mit Spracheingabe, Live-Anzeige der Agent-Schritte, **Prüfen-und-Bestätigen**-Ansicht | Einsprechen → Entwurf → bestätigen funktioniert |
| 6:00–7:30 | Stations-Board mit Karten, Hervorhebungen, Mini-Verlauf, „Übernommen“ | Übernehmende Sicht komplett |
| 7:30–9:30 | **Stufe 2:** eine Aufnahme am Stück, Agent teilt nach Patienten auf | Demo-Transkript wird richtig aufgeteilt |
| 9:30–10:00 | Feinschliff, Fehler | Demo läuft 3× hintereinander fehlerfrei |
| 10:00–11:00 | **Feature-Stopp.** Pitch-Folien, Demo-Skript, proben | |
| 11:00–12:00 | Puffer | |

**Plan B:**
- Spracheingabe zickt → Demo über das Textfeld mit vorbereitetem Transkript.
- Stufe 2 (am Stück) nicht fertig → Demo pro Patient.
- Agent zu langsam → Modell in der Konfiguration auf Sonnet 5.5 umstellen.

## Demo-Skript (3 Minuten)
1. **Problem** (30 s): Schichtwechsel, Infos gehen verloren.
2. **Live** (90 s): Die Übergabe für die Station am Stück einsprechen. Der Agent trennt die Patienten, findet den Blutdruck-Trend bei „Frau M., Zimmer 4“ und schlägt eine rote Warnung vor. Die Pflegekraft prüft und bestätigt.
3. **Board** (30 s): Die übernehmende Pflegekraft sieht alles auf einen Blick, wichtige Punkte sind hervorgehoben. Sie tippt auf „Übernommen“.
4. **Ausblick** (30 s): Anbindung an Klinik-Systeme (FHIR/SAP), Datenschutz durch Spracherkennung vor Ort, Version fürs Handy.

## Risiken
- **Datenschutz:** Die Web Speech API schickt die Audiodaten an Google. Für die Demo mit erfundenen Daten ist das okay, in der Praxis bräuchte es Spracherkennung vor Ort. Das gehört auf die Ausblick-Folie.
- **Spracherkennung bei Fachbegriffen:** Mit dem Text-Fallback abgesichert.
- **Falsche Zuordnung von Patienten** bei der Aufnahme am Stück: Wird durch die Bestätigung durch den Menschen abgefangen.
- **Schwankende KI-Ergebnisse** bei der Trend-Erkennung: Mehrfach mit dem Demo-Transkript testen.
- **Haftung:** Der Agent formuliert Hinweise, keine Anweisungen. Der Mensch bestätigt immer.
- **Demo hängt am Datum:** Weil die Schicht aus dem Dienstplan kommt, müssen die Dienstplan-Einträge zum **Datum der Präsentation** passen. Kurz vor der Demo prüfen.
- **Arbeitgeber-Daten:** Kein Zugriff auf das SAP-System oder Daten des Arbeitgebers, alles ist erfunden.

## Offene Fragen
Keine. Alle Entscheidungen sind in fünf Grill-Runden geklärt.
