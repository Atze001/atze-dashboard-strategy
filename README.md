# Atze Dashboard Strategy

![Atze Dashboard Strategy](dist/assets/wohnzimmer.jpg)

Eine automatische Home-Assistant-Dashboard-Strategy im Apple-Home-inspirierten
Stil. Räume und Entities werden automatisch aus Home Assistant erzeugt und über
YAML-Overrides angepasst.

## Aktueller Stand

Version **0.130.0**

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

### v0.130.0

- Die grauen Kreise hinter Öffnen, Stoppen und Schließen bleiben bei
  Rollladen-Karten immer sichtbar.
- Bei aktuell nicht möglichen Aktionen wird nur noch das jeweilige Symbol
  abgeschwächt, nicht mehr der gesamte Kreis.

### v0.129.0

- Geöffnete Rollläden erhalten eine weiße Kartenfläche im Apple-Home-Stil.
- Name, Zustand und Position bleiben dabei dunkel; die Steuertasten wechseln
  ebenfalls auf dunkle Symbole mit dezent grauem Hintergrund.
- Geschlossene Rollläden verwenden weiterhin die dunkle Kartenfläche mit
  heller Schrift und hellen Bedienelementen.

### v0.128.0

- Rollladen-Karten verwenden eigene Icons für geöffnet und geschlossen.
- Status und aktuelle Position werden gemeinsam angezeigt.
- Tippen führt die Bubble-Card-Aktion `toggle` aus; die Kartenfläche öffnet
  über `button_action` die Detailansicht.
- `main_buttons_position` verwendet den Bubble-Card-Standardwert `default`.

## Lizenz

MIT
