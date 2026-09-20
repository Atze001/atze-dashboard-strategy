# Atze Dashboard Strategy
<sub>KI-Generiert: ChatGPT</sub>

![Atze Dashboard Strategy](dist/assets/wohnzimmer.jpg)

Eine automatische Home-Assistant-Dashboard-Strategy im Apple-Home-inspirierten
Stil. Räume und Entities werden automatisch aus Home Assistant erzeugt und über
YAML-Overrides angepasst.

Aktuell ist es ein work-in-progress. Bedeutet das die Version noch nicht Final ist.

## Aktueller Stand

Version **0.167.0**

Enthalten sind unter anderem:

- automatische Raumansichten
- Apple-Home-inspirierte Deckseite mit Raumbildern
- Bubble-Card-Unterstützung
- Fenster-, Rollladen-, Schloss- und Leistungsstatus auf den Raumbildern
- labelbasierte Sicherheitsansicht
- Wartungs-/Batterieansicht nach Räumen
- Kiosk-Mode-Unterstützung
- automatische Popups und technische Detailansichten
- grafische Auswahl der sichtbaren Räume und Entitäten
- konfigurierbare Favoriten zwischen Status- und Raumkacheln
- frei konfigurierbare eigene Dashboard-Seiten
- automatische Navigationsbuttons zu eigenen Seiten auf der Startseite
- optionales Zeitpläne-Bubble-Popup mit Scheduler Card
- optionales Lichtsteuerungs-Bubble-Popup aus einer eigenen Seite
- helle Raumbilder bei eingeschaltetem Licht und dunkle Bilder bei
  ausgeschaltetem Licht

## Installation über HACS

Dieses Repository wird in HACS als **Dashboard** / Plugin hinzugefügt.

1. HACS öffnen.
2. Oben rechts `⋮` → **Custom repositories**.
3. Repository-URL eintragen.
4. Typ **Dashboard** wählen.
5. Repository hinzufügen und herunterladen.
6. Home Assistant Frontend neu laden.

Die Resource lautet nach der Installation normalerweise:

```text
/hacsfiles/atze-dashboard-strategy/atze-dashboard-strategy.js
```

HACS verwaltet die Resource bei aktuellen Home-Assistant-/HACS-Versionen in der
Regel automatisch.

## Voraussetzungen / empfohlene Erweiterungen

Für die vollständige Funktion der Strategy werden bzw. empfehlen sich folgende
Home-Assistant-Erweiterungen. Am einfachsten werden sie über **HACS**
installiert.

| Erweiterung | Status | Verwendung | Installation / Repository |
| --- | --- | --- | --- |
| **HACS** | empfohlen | Installation und Updates der Strategy sowie der meisten Zusatzkarten | [HACS](https://www.hacs.xyz/) |
| **Bubble Card** | **erforderlich** | Raumkarten, Climate-Karten und Bubble-Popups der Strategy | [GitHub – Clooos/Bubble-Card](https://github.com/Clooos/Bubble-Card) · in HACS nach **Bubble Card** suchen |
| **Bubble Card Tools** | empfohlen | Backend für den Bubble-Card Module Store und die Modulverwaltung | [GitHub – Clooos/Bubble-Card-Tools](https://github.com/Clooos/Bubble-Card-Tools) · in HACS nach **Bubble Card Tools** suchen |
| **card-mod** | empfohlen / optional | zusätzliche CSS-Anpassungen und Styling von Home-Assistant-Karten | [GitHub – thomasloven/lovelace-card-mod](https://github.com/thomasloven/lovelace-card-mod) · in HACS nach **card-mod** suchen |
| **Kiosk Mode** | optional | Ausblenden von Header und Sidebar bei Wand-/Kiosk-Displays | [GitHub – 00-10-01-11/ha-kiosk-mode](https://github.com/00-10-01-11/ha-kiosk-mode) · in HACS nach **Kiosk Mode** suchen |
| **Scheduler Card** | optional | wird für das optionale Zeitpläne-Bubble-Popup benötigt | [GitHub – nielsfaber/scheduler-card](https://github.com/nielsfaber/scheduler-card) · in HACS nach **Scheduler Card** suchen |
| **Scheduler Component** | optional | Backend/Integration für die Scheduler Card | [GitHub – nielsfaber/scheduler-component](https://github.com/nielsfaber/scheduler-component) · in HACS nach **Scheduler Component** suchen |
| **Alarmo** | optional | liefert den Alarmstatus für die Alarmo-Kachel auf der Startseite | [GitHub – nielsfaber/alarmo](https://github.com/nielsfaber/alarmo) · in HACS nach **Alarmo** suchen |

### Was davon ist wirklich nötig?

Für die Grundfunktionen des Dashboards ist **Bubble Card** die wichtigste
externe Abhängigkeit. **Bubble Card Tools**, **card-mod** und **Kiosk Mode**
erweitern bzw. vereinfachen das Setup, werden aber nicht für jede Funktion der
Strategy zwingend benötigt.

**Scheduler Card** und **Scheduler Component** brauchst du nur, wenn das
optionale Zeitpläne-Popup verwendet werden soll. **Alarmo** ist ebenfalls nur
notwendig, wenn die Alarmo-Anzeige genutzt wird; ist keine passende Entität
vorhanden, wird die Kachel automatisch ausgeblendet.

## Dashboard-YAML

Die Strategy wird direkt verwendet – **kein äußeres `strategy:`**:

```yaml
type: custom:atze-dashboard
```

Eine vollständige Beispielkonfiguration befindet sich in `example.yaml`.

## Entwicklung

Die bearbeitbaren Quelldateien liegen in `src/`; die Datei in `dist/` ist das
von HACS geladene Ergebnis. Die Versionsnummer wird ausschließlich über
`ATZE_VERSION` in `src/00-core.js` gepflegt. Nach Änderungen in `src/`
erzeugt die GitHub Action automatisch `dist/atze-dashboard-strategy.js` und
synchronisiert dieselbe Versionsnummer nach `package.json` sowie in den
Abschnitt **Aktueller Stand** dieser README. Lokal lässt sich derselbe Schritt
bei Bedarf mit `npm run build` ausführen.

## Raum-Bilder

Die mitgelieferten Bilder liegen unter `dist/assets/` und werden automatisch
den Bereichen Küche, Schlafzimmer, Bad, Flur, Hausflur, Wohnzimmer, Büro,
Arbeitszimmer, Kinderzimmer, Balkon, 3D-Drucker und Zentrale zugeordnet.

## Sicherheit

Die Ansicht `sicherheit` übernimmt alle Entities mit dem Home-Assistant-Label
**Sicherheit** und gruppiert sie nach Bereichen.

## Wartung

Die Ansicht `wartung` erkennt Batteriesensoren automatisch und gruppiert sie
nach **Gut (41–100 %)**, **Niedrig (21–40 %)** und **Kritisch (0–20 %)**.
Innerhalb der Abschnitte stehen die niedrigsten Ladestände zuerst.

## Letzte Änderungen

### v0.167.0

- README um einen Abschnitt **Voraussetzungen / empfohlene Erweiterungen**
  ergänzt.
- Bubble Card, Bubble Card Tools, card-mod, Kiosk Mode, Scheduler Card,
  Scheduler Component und Alarmo sind mit HACS-/GitHub-Hinweisen dokumentiert.
- Pflicht-, empfohlene und optionale Komponenten sind getrennt gekennzeichnet.

### v0.166.0

- Auswahlfelder für **Personen** und **Stromsensor** bleiben jetzt geöffnet,
  auch wenn Home Assistant während der Auswahl neue Zustände liefert.
- Dafür verwenden beide Dropdowns denselben Interaktionsschutz wie die
  bereits korrigierte Auswahl **Auto / sichtbar / unsichtbar**.

### v0.165.0

- Die Strom-Kachel wird ausgeblendet, wenn der verwendete Leistungssensor
  fehlt, `unknown`, `unavailable` oder kein numerischer Wert vorhanden ist.
- Im Dashboard-Menü unter **Startseite / Status** kann der gewünschte
  Stromsensor ausgewählt werden.
- Ohne manuelle Auswahl bleibt die automatische Erkennung eines geeigneten
  Leistungssensors aktiv.

### v0.164.0

- Auf der Startseite können drei zusätzliche `person.`-Entitäten angezeigt
  werden. Das Profilbild erscheint bei Anwesenheit normal und bei Abwesenheit
  rot; der Friendly Name steht klein unter dem Bild.
- Die drei Personen lassen sich im Dashboard-Menü unter
  **Personen / Anwesenheit** auswählen.
- **Alarmo** und **AtzeHomeBase** werden auf der Hauptseite ausgeblendet,
  solange ihre Status-Entität `unknown`, `unavailable` oder leer ist.

### v0.163.0

- Standard-Raumbilder werden jetzt auch bei erweiterten Area-IDs und
  Raumnamen zuverlässig erkannt, z. B. `hausflur-eg` oder
  `hausflur-1-og`.
- **Treppenhaus** und **Treppenflur** werden als Alias für **Hausflur**
  behandelt.
- Bestehende exakte Area-IDs bleiben unverändert bevorzugt.

### v0.162.0

- Kinderzimmer-Bilder ohne eingeblendete Beschriftung ersetzt.
- Hausflur-Bilder durch die neue Treppenhaus-Ansicht ersetzt.
- Bild-Fallback für Räume unterstützt jetzt auch `.webp` und abweichende
  Area-IDs zuverlässig über den Raumnamen.

### v0.161.0

- Neue helle und dunkle Standardbilder für **Kinderzimmer** und **Hausflur**.
- **Arbeitszimmer** verwendet automatisch dieselben hellen und dunklen
  Standardbilder wie **Büro**.

### v0.159.2

- Die aktuelle Versionsnummer wird auch im Dashboard-Titel und bei der
  Strategy-Anzeige aus `ATZE_VERSION` übernommen.
- Unter **Entitäten pro Raum** gibt es jetzt denselben Suchfilter wie unter
  **Favoriten**.

### v0.159.0

- Der Quellcode ist jetzt nach Verantwortlichkeiten in `src/` aufgeteilt.
- `npm run build` erzeugt daraus weiterhin die von HACS verwendete Datei
  `dist/atze-dashboard-strategy.js`.
- Eine GitHub Action baut diese Datei nach Änderungen in `src/` automatisch
  neu und schreibt sie in den jeweiligen Branch zurück.

### v0.158.0

- Die Texte der sechs Statuskacheln auf dem Hausbild stehen jetzt exakt **5 px**
  näher an ihren Icons.

### v0.157.0

- Beim Aktivieren der **Lichtsteuerung** werden elf benötigte Helfer automatisch
  geprüft und fehlende Helfer mit den vorgesehenen Startwerten angelegt.
- Vorhandene Helfer und ihre aktuellen Werte werden nicht verändert.
- Alle Lichtsteuerungs-Helfer werden automatisch der Helfer-Kategorie
  **Atze Dashboard Strategy - Licht** zugeordnet.
- Bereits aktivierte Lichtsteuerungen werden beim nächsten Öffnen der
  Dashboard-Einstellungen automatisch nachgerüstet.

## Lizenz

MIT
