# Atze Dashboard Strategy
<sub>KI-Generiert: ChatGPT</sub>

![Atze Dashboard Strategy](dist/assets/wohnzimmer.jpg)

Eine automatische Home-Assistant-Dashboard-Strategy im Apple-Home-inspirierten
Stil. Räume und Entities werden automatisch aus Home Assistant erzeugt und über
YAML-Overrides angepasst.

Aktuell ist es ein work-in-progress. Bedeutet das die Version noch nicht Final ist.

## Aktueller Stand

Version **0.213.0**

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
- automatischer HACS-Update-Hinweis auf der Startseite

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

## Blueprint Lichtsteuerung

Der Blueprint liegt im Repository zusätzlich als gut sichtbare Quelldatei unter:

`blueprints/lichtsteuerung.yaml`

Beim Laden der Dashboard-Strategy prüft ein Home-Assistant-Admin automatisch,
ob der Automation-Blueprint in Home Assistant vorhanden ist. Fehlt er, wird er
über die Home-Assistant-Blueprint-API angelegt und anschließend nochmals
verifiziert.

Der Zielpfad in Home Assistant ist:

`/config/blueprints/automation/atze dashboard strategy/lichtsteuerung.yaml`

Home Assistant erzeugt die fehlenden Unterordner beim Speichern automatisch.
Der Blueprint verwendet die von der Strategy fest angelegten Helfer für
**Aktivierung, Startzeiten, Helligkeit und Farbtemperatur** automatisch. Beim
Erstellen einer Automation müssen deshalb nur noch die Lampen sowie die drei
raumbezogenen Zeitversätze für **Morgen**, **Abend** und **Nacht** ausgewählt
werden. Die Zeitversätze werden direkt in der jeweiligen Blueprint-Automation
gespeichert; dafür sind keine zusätzlichen Helfer nötig.

Ändert sich die mitgelieferte Blueprint-Version, aktualisiert die Strategy den
bereits in Home Assistant vorhandenen Blueprint automatisch.

### Lichtsteuerung V2 ohne Helfer

Als eigenständige Alternative liegt zusätzlich folgende Blueprint-Datei im
Repository:

`blueprints/lichtsteuerung-v2.yaml`

Bei dieser Variante werden Startzeit, Helligkeit und Farbtemperatur für
**Morgen**, **Abend** und **Nacht** direkt beim Erstellen der Automation
eingetragen. Sie verwendet keine Home-Assistant-Helfer und enthält keine
Zeitversätze. Aktiviert und deaktiviert wird sie über den normalen Schalter der
erstellten Automation. Die vorhandene Lichtsteuerung bleibt unverändert. Ab Version **0.189.0** werden
sowohl V1 als auch V2 automatisch von der Dashboard-Strategy installiert und
bei Änderungen aktualisiert.

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

### v0.189.0

- Automatische Blueprint-Installation um `lichtsteuerung-v2.yaml` erweitert.
- V1 und V2 werden beim Laden der Startseite unabhängig geprüft, installiert
  und bei einer neuen Blueprint-Version aktualisiert.
- Die bestehende V1 bleibt unverändert erhalten.

### v0.188.0

- Eigenständigen Blueprint `lichtsteuerung-v2.yaml` ergänzt.
- Zeiten, Helligkeiten und Farbtemperaturen werden direkt in der jeweiligen
  Blueprint-Automation gespeichert.
- V2 benötigt keine Helfer und enthält keine Zeitversätze.

### v0.187.0

- Swipe-zurück-Erkennung von einzelnen Karteninstanzen entkoppelt.
- Die Gestensteuerung bleibt nun dashboardweit persistent aktiv und prüft
  bei jeder Geste die aktuelle Dashboard-URL.
- Dadurch funktioniert Swipe nach rechts auch nach wiederholtem Verlassen und
  erneutem Öffnen derselben Unterseite.
- Randzone von 28 px, Mindestweg von 140 px und Slide-out-Effekt bleiben
  unverändert.

### v0.186.0

- Swipe-Navigation auf wiederholt geöffneten Unterseiten repariert.
- Die aktive Unterseite wird jetzt bei jedem Touch über den tatsächlichen
  Home-Assistant-Event-Pfad ermittelt, statt eine möglicherweise gecachte
  View wiederzuverwenden.
- Der Slide-out-Effekt, die 28-px-Randzone für die HA-Seitenleiste und die
  140-px-Mindeststrecke bleiben unverändert.

### v0.185.0

- Swipe-zur-Hauptseite mit direktem **Slide-out-Feedback** ergänzt.
- Während des Wischens folgt die komplette aktuelle Unterseite dem Finger
  nach rechts.
- Ab **140 px** wird die Geste bestätigt; die Seite gleitet vollständig nach
  rechts heraus und anschließend wird das Haupt-Dashboard geöffnet.
- Wird vorher losgelassen, federt die Seite weich an ihre Ausgangsposition
  zurück.
- Die ersten **28 px am linken Rand** bleiben weiterhin vollständig für die
  native Home-Assistant-Seitenleisten-Geste reserviert.
- Slider, Buttons und Eingabefelder bleiben von der Swipe-Geste ausgenommen.

### v0.184.0

- Mindestweg für den Swipe nach rechts von 90 auf **140 px** erhöht.
- Alle übrigen Gesten-Anpassungen bleiben unverändert.

### v0.183.0

- Mindestweg für den Swipe zurück zum Haupt-Dashboard wieder auf **90 px**
  erhöht.
- Die übrigen Verbesserungen aus v0.182.0 bleiben erhalten: Start überall
  außerhalb der reservierten 28-px-Randzone, großzügigere Diagonaltoleranz
  und Schutz für Bedienelemente.

### v0.182.0

- Swipe-zur-Startseite deutlich empfindlicher und zuverlässiger gemacht.
- Touch-Erkennung auf `touchstart` / `touchend` umgestellt, was besonders
  in iOS und der Home-Assistant-App zuverlässiger reagiert.
- Die ersten **28 px am linken Rand** bleiben weiterhin vollständig für die
  Home-Assistant-Seitenleisten-Geste reserviert.
- Der Dashboard-Swipe kann nun überall rechts neben dieser Randzone beginnen.
- Mindestweg von 90 auf **60 px** reduziert und etwas mehr diagonale Bewegung
  zugelassen.
- Slider, Buttons und Eingabefelder bleiben weiterhin ausgeschlossen.

### v0.181.0

- Kritischen Syntaxfehler aus v0.180.0 in der Swipe-Navigation behoben.
- Der Regex zur Bereinigung des Home-Pfads war im Build doppelt escaped und
  verhinderte dadurch die Registrierung der Dashboard-Strategy.
- Swipe-nach-rechts-Funktion bleibt unverändert erhalten.

### v0.180.0

- Swipe-nach-rechts-Geste auf Unterseiten ergänzt: ein deutlicher Wisch
  navigiert zurück zum Haupt-Dashboard.
- Die ersten **28 px am linken Bildschirmrand** bleiben von der Strategy
  vollständig unberührt, damit Home Assistants eigene Seitenleisten-Geste
  weiterhin funktioniert.
- Die Dashboard-Geste startet nur im linken Bereich neben dieser Randzone und
  verlangt mindestens 90 px horizontale Bewegung.
- Vertikale Bewegungen sowie Gesten auf Slidern, Eingabefeldern, Buttons und
  anderen Bedienelementen werden ignoriert.
- Aktiv auf Raumseiten, Sicherheit, Wartung und eigenen Unterseiten; auf der
  Hauptseite selbst ist die Geste nicht aktiv.

### v0.179.0

- Nach-oben-Pfeil horizontal mittig am unteren Rand positioniert.
- Der blaue Hintergrundkreis ist jetzt zu 50 % transparent; das Pfeil-Icon
  bleibt vollständig sichtbar.

### v0.178.0

- Dashboardweiter **Nach-oben-Pfeil** ergänzt.
- Der runde Button erscheint unten rechts, sobald ungefähr 250 px nach unten
  gescrollt wurde.
- Ein Klick scrollt die aktuelle Dashboard-Seite weich zum Anfang zurück.
- Oben angekommen wird der Button automatisch wieder ausgeblendet.
- Funktioniert auf Startseite, Raumseiten, Sicherheit, Wartung und eigenen
  Unterseiten.

### v0.177.0

- Den separaten Eintrag **Lichtsteuerungs-Blueprint** samt
  **Prüfen / installieren** aus den Dashboard-Einstellungen entfernt.
- Die automatische Installation und Aktualisierung des Blueprints über die
  Startseitenkarte bleibt unverändert aktiv.

### v0.176.0

- Der Lichtsteuerungs-Blueprint übernimmt die fest integrierten Helfer für
  Aktivierung, Morgen/Abend/Nacht, Helligkeit und Farbtemperatur automatisch.
- Im Blueprint bleiben nur Lampenauswahl sowie Morgen-, Abend- und
  Nacht-Zeitversatz als Benutzereingaben.
- Bereits installierte ältere Blueprint-Versionen werden beim Laden
  automatisch auf die aktuelle Version aktualisiert.

### v0.175.0

- Die automatische Blueprint-Prüfung wurde aus der Strategy-Generierung in
  die tatsächlich geladene Startseitenkarte verschoben.
- Sobald die Home-Overview-Card ihren ersten Home-Assistant-State erhält,
  wird der Lichtsteuerungs-Blueprint genau einmal pro Karteninstanz geprüft
  und bei Bedarf angelegt.
- Der manuelle Button **Prüfen / installieren** bleibt als Fallback erhalten.

### v0.174.0

- Automatische Blueprint-Prüfung wird nicht mehr durch eine Frontend-Admin-
  Abfrage übersprungen; Home Assistant prüft die Berechtigung selbst.
- Die automatische Prüfung wird einmal pro Seitenladung ausgeführt.
- Unter **Darstellung → Lichtsteuerungs-Blueprint** gibt es jetzt
  **Prüfen / installieren**.
- Der manuelle Test zeigt Erfolg oder den konkreten Home-Assistant-Fehler
  direkt im Dashboard-Menü an.

### v0.173.0

- Lichtsteuerungs-Blueprint wieder als sichtbare Quelldatei im Repository
  unter `blueprints/lichtsteuerung.yaml` aufgenommen.
- Automatische Installation läuft jetzt bereits beim normalen Laden der
  Strategy durch einen Admin und nicht nur im Dashboard-Editor.
- Nach `blueprint/save` wird per `blueprint/list` geprüft, ob der Blueprint
  tatsächlich in Home Assistant angekommen ist.
- Zielpfad in Home Assistant bleibt
  `/config/blueprints/automation/atze dashboard strategy/lichtsteuerung.yaml`.

### v0.172.0

- Die Lichtsteuerung legt den benötigten Automation-Blueprint jetzt wie die
  Helfer automatisch in Home Assistant an.
- Zielpfad:
  `/config/blueprints/automation/atze dashboard strategy/lichtsteuerung.yaml`.
- Die versehentliche Ablage des Blueprints als normale Datei im
  Strategy-Repository wird wieder entfernt.

### v0.171.0

- Lichtsteuerungs-Blueprint ins Repository aufgenommen.
- Ablage unter
  `blueprints/automation/atze dashboard strategy/lichtsteuerung.yaml`.
- Blueprint enthält Lampenauswahl und getrennte Zeitversätze für Morgen,
  Abend und Nacht.

### v0.170.0

- HACS-Update-Erkennung erneut korrigiert: Funktionsparameter und Aufruf
  verwenden jetzt die jeweils richtige Entity-Liste.
- Der verbleibende `ReferenceError: Can't find variable: entities` aus
  v0.169.0 ist damit behoben.

### v0.169.0

- Fehler beim Laden der Dashboard-Strategy aus v0.168.0 behoben.
- Die HACS-Update-Erkennung verwendet jetzt die im Home-View tatsächlich
  verfügbare Entity-Liste statt einer dort nicht definierten Variable.

### v0.168.0

- Oberhalb des ersten Bereichs erscheint bei verfügbaren HACS-Updates
  automatisch mittig eine rote Badge **Update vorhanden**.
- Die Badge wird ausschließlich aus HACS-`update.`-Entitäten ermittelt und
  bleibt ohne verfügbares HACS-Update vollständig ausgeblendet.
- Ein Klick auf die Badge öffnet direkt die HACS-Übersicht.

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
