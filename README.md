# Atze Dashboard Strategy

![Atze Dashboard Strategy](dist/assets/wohnzimmer.jpg)

Eine automatische Home-Assistant-Dashboard-Strategy im Apple-Home-inspirierten
Stil. Räume und Entities werden automatisch aus Home Assistant erzeugt und über
YAML-Overrides angepasst.

## Aktueller Stand

Version **0.143.0**

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

Die Ansicht `wartung` erkennt Batteriesensoren automatisch, gruppiert sie nach
Bereichen und zeigt den Ladezustand im Apple-Home-Stil an.

## Letzte Änderungen

### v0.143.0

- Die Anwesenheitsicons werden wieder vollständig am rechten Rand der
  Sensorzeile angezeigt.
- Aktive rote Warnicons behalten oben rechts ihre feste Kreisgröße und werden
  auch bei mehreren Warnungen nicht zusammengedrückt.
- Die festen Positionen aller Kartenanzeigen bleiben unverändert; entfernt
  wurde nur eine überzählige Breitenangabe der absolut positionierten Zeile.

### v0.142.0

- Raumname und untere Sensorzeile besitzen nun jeweils eine eigene feste
  Position relativ zur oberen Kartenkante.
- Fehlende Temperatur-, Luftfeuchtigkeits-, Anwesenheits-, Leistungs- oder
  Lux-Anzeigen beeinflussen dadurch keine anderen Elemente mehr.
- Messwert-Bubbles, Status-Bubbles und blaue Bereichs-Bubbles waren bereits
  oben verankert; damit sind nun sämtliche Anzeigen unabhängig positioniert.

### v0.141.0

- Die blauen Bereichs-Bubbles einschließlich ihrer Icons wurden auf allen
  Bildkarten um fünf Pixel nach unten verschoben.
- Die Raumnamen wie **Flur**, **Küche** oder **Wohnzimmer** wurden ebenfalls um
  fünf Pixel nach unten verschoben; die untere Sensorzeile bleibt unverändert.

## Lizenz

MIT
