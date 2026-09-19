# Atze Dashboard Strategy

![Atze Dashboard Strategy](dist/assets/wohnzimmer.jpg)

Eine automatische Home-Assistant-Dashboard-Strategy im Apple-Home-inspirierten
Stil. Räume und Entities werden automatisch aus Home Assistant erzeugt und über
YAML-Overrides angepasst.

## Aktueller Stand

Version **0.126.0**

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

Die Ansicht `wartung` erkennt Batteriesensoren automatisch, gruppiert sie nach
Bereichen und zeigt den Ladezustand im Apple-Home-Stil an.

## Letzte Änderungen

### v0.126.0

- Rollläden und andere Cover werden automatisch als native Bubble-Card-Cover
  mit `card_type: cover` erzeugt.
- Die Karte verwendet damit die integrierten Öffnen-, Stoppen- und
  Schließen-Bedienelemente der Bubble Card.
- Cover erhalten standardmäßig zwei Rasterzeilen; dies kann bei Bedarf über
  `cover_card_rows` oder pro Entität über `rows` überschrieben werden.

### v0.125.0

- Jede unter **Eigene Seiten** erzeugte Ansicht erhält automatisch oben einen
  Homebutton mit dem jeweiligen Seitentitel.
- Der Button führt zuverlässig zum konfigurierten `home_path` zurück und wird
  auch bei Karten-, Sections- und Panel-Ansichten automatisch eingefügt.
- Die Seiten-YAML selbst benötigt dafür keinen zusätzlichen Navigationscode.

### v0.124.0

- Oberhalb der Favoriten erscheinen automatisch kompakte Buttons für alle
  unter **Eigene Seiten** angelegten Ansichten.
- Icon und Titel werden aus der jeweiligen Ansichts-YAML übernommen; ein Tipp
  navigiert direkt zum konfigurierten Pfad.
- Auf kleinen Displays ist die Buttonleiste horizontal scrollbar.

## Lizenz

MIT
