# Atze Dashboard Strategy

<sub>KI-Generiert: ChatGPT</sub>

![Atze Dashboard Strategy](dist/assets/wohnzimmer.jpg)

Eine automatische Home-Assistant-Dashboard-Strategy im Apple-Home-inspirierten
Stil. Räume und Entities werden automatisch aus Home Assistant erzeugt und über
YAML-Overrides angepasst.

## Aktueller Stand

Version **0.148.0**

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

### v0.151.0

- Die sechs Statuskacheln verwenden nun identische Rasterhöhen, Innenmaße und
  Icon-Flächen, damit beide Spalten exakt ausgerichtet sind.
- Die bisherige Kachel **Fenster / Rollläden** wurde durch **Batterie** ersetzt
  und öffnet direkt die Batterieübersicht.
- Die Batterieübersicht zeigt alle Batteriesensoren gemeinsam und sortiert sie
  vom niedrigsten zum höchsten Ladestand.
- Rollläden werden automatisch in die Sicherheitsansicht und deren Warnungszahl
  aufgenommen.

### v0.150.0

- Die scharfe Serverraum-Grafik verwendet einen neuen Dateinamen, damit
  Home Assistant und der Browser nicht länger die alte, unscharfe Version aus
  dem Cache laden.
- Alarmo und AtzeHomeBase zeigen den Status **deaktiviert** rot an; alle anderen
  Zustände werden grün dargestellt.

### v0.149.0

- Der Serverraum-Hintergrund der Navigations- und Favoritenkarte ist jetzt
  deutlich heller, schärfer und detailreicher.
- Die dunkle Abdeckung wurde reduziert; Aufbau, Buttons und Favoriten bleiben
  unverändert und weiterhin gut lesbar.

## Lizenz

MIT
