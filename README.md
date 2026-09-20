# Atze Dashboard Strategy
<sub>KI-Generiert: ChatGPT</sub>

![Atze Dashboard Strategy](dist/assets/wohnzimmer.jpg)

Eine automatische Home-Assistant-Dashboard-Strategy im Apple-Home-inspirierten
Stil. Räume und Entities werden automatisch aus Home Assistant erzeugt und über
YAML-Overrides angepasst.

Aktuell ist es ein work-in-progress. Bedeutet das die Version noch nicht Final ist.

## Aktueller Stand

Version **0.157.0**

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

## Dashboard-YAML

Die Strategy wird direkt verwendet – **kein äußeres `strategy:`**:

```yaml
type: custom:atze-dashboard
```

Eine vollständige Beispielkonfiguration befindet sich in `example.yaml`.

## Raum-Bilder

Die mitgelieferten Bilder liegen unter `dist/assets/` und werden automatisch
den Bereichen Küche, Schlafzimmer, Bad, Flur, Wohnzimmer, Büro, Balkon,
3D-Drucker und Zentrale zugeordnet.

## Sicherheit

Die Ansicht `sicherheit` übernimmt alle Entities mit dem Home-Assistant-Label
**Sicherheit** und gruppiert sie nach Bereichen.

## Wartung

Die Ansicht `wartung` erkennt Batteriesensoren automatisch und gruppiert sie
nach **Gut (41–100 %)**, **Niedrig (21–40 %)** und **Kritisch (0–20 %)**.
Innerhalb der Abschnitte stehen die niedrigsten Ladestände zuerst.

## Letzte Änderungen

### v0.157.0

- Beim Aktivieren der **Lichtsteuerung** werden elf benötigte Helfer automatisch
  geprüft und fehlende Helfer mit den vorgesehenen Startwerten angelegt.
- Vorhandene Helfer und ihre aktuellen Werte werden nicht verändert.
- Alle Lichtsteuerungs-Helfer werden automatisch der Helfer-Kategorie
  **Atze Dashboard Strategy - Licht** zugeordnet.
- Bereits aktivierte Lichtsteuerungen werden beim nächsten Öffnen der
  Dashboard-Einstellungen automatisch nachgerüstet.

### v0.156.0

- Unter **Darstellung** lässt sich nun auch **Lichtsteuerung** als
  Startseitenpunkt ein- oder ausschalten.
- Eine vorhandene eigene Seite mit Titel oder Pfad **Lichtsteuerung** wird
  automatisch in ein separates Bubble-Card-Popup übernommen.
- Die Kartenkonfiguration und vorhandene Helfer-Verknüpfungen der eigenen Seite
  bleiben dabei unverändert erhalten.

### v0.155.0

- Das Zeitpläne-Popup wird getrennt von der Startseitenkarte eingebunden.
  Bubble Card kann dadurch nicht mehr versehentlich das gesamte Dashboard
  ausblenden.

## Lizenz

MIT
