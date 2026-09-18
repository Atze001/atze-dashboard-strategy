# Atze Dashboard Strategy

![Atze Dashboard Strategy](dist/assets/wohnzimmer.jpg)

Eine automatische Home-Assistant-Dashboard-Strategy im Apple-Home-inspirierten
Stil. Räume und Entities werden automatisch aus Home Assistant erzeugt und über
YAML-Overrides angepasst.

## Aktueller Stand

Version **0.88.0**

Enthalten sind unter anderem:

- automatische Raumansichten
- Apple-Home-inspirierte Deckseite mit Raumbildern
- Bubble-Card-Unterstützung
- Fenster-, Rollladen-, Schloss- und Leistungsstatus auf den Raumbildern
- labelbasierte Sicherheitsansicht
- Wartungs-/Batterieansicht nach Räumen
- Kiosk-Mode-Unterstützung
- automatische Popups und technische Detailansichten

## Installation über HACS

Dieses Repository wird in HACS als **Dashboard** / Plugin hinzugefügt.

1. HACS öffnen.
2. Oben rechts `⋮` → **Custom repositories**.
3. Repository-URL eintragen.
4. Typ **Dashboard** wählen.
5. Repository hinzufügen und herunterladen.
6. Home Assistant Frontend neu laden.

Die Runtime-Dateien liegen bewusst unter `dist/`, da neben der JavaScript-Datei
auch die Raum-Bilder ausgeliefert werden.

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

Die Bilder liegen unter:

```text
dist/assets/
```

Enthalten:

- Küche
- Schlafzimmer
- Bad
- Flur
- Wohnzimmer
- Büro
- Balkon

Die Strategy lädt sie zuerst relativ zur eigenen JavaScript-Datei. Dadurch
funktionieren sie sowohl unter HACS (`/hacsfiles/...`) als auch bei manueller
Installation.

## Sicherheit

Die Ansicht `sicherheit` übernimmt direkt alle Entities mit dem
Home-Assistant-Label **Sicherheit** und gruppiert sie nach Bereichen.

## Wartung

Die Ansicht `wartung` erkennt Batteriesensoren automatisch, gruppiert sie nach
Bereichen und zeigt den Ladezustand im Apple-Home-Stil an.

## Lizenz

MIT


## v0.81 Native Header-Ausblendung

Bei Strategy-Dashboards kann `kiosk-mode` die von der Strategy erzeugte
Root-Konfiguration nicht immer selbst auswerten. Deshalb besitzt die Strategy
jetzt einen eigenen, auf den Lovelace-Header begrenzten Fallback.

Die bestehende Konfiguration funktioniert weiter unverändert:

```yaml
kiosk_mode:
  hide_header: true
```

Auch `kiosk_mode: { kiosk: true }` blendet über den Fallback den Header aus.
`?disable_km` deaktiviert den nativen Fallback temporär ebenfalls.

Optional kann der Strategy-Fallback abgeschaltet werden:

```yaml
native_kiosk_fallback: false
```


## Versionsanzeige in HACS

Das Repository erzeugt bei jeder neuen Strategy-Version automatisch einen
GitHub Release mit einem Tag wie `v0.82.0`.

HACS verwendet diesen Release-Tag als sichtbare Versionsnummer. Ohne Releases
würde HACS stattdessen nur die ersten sieben Zeichen des letzten Commit-SHA
anzeigen.

## Kiosk-Mode bei Strategy-Dashboards

Die Strategy unterstützt weiterhin:

```yaml
kiosk_mode:
  hide_header: true
```

Da `kiosk-mode` die erzeugte Root-Konfiguration eines Strategy-Dashboards
nicht zuverlässig ausliest, setzt die Strategy für diese Einstellung
automatisch den offiziellen URL-Schalter `?hide_header` und lädt die Seite
einmal neu. Ein intern gesetzter Marker verhindert Endlosschleifen und erlaubt
das automatische Entfernen wieder, wenn die Option später deaktiviert wird.


## v0.83 Kiosk-Fix

Die automatische Kiosk-URL-Behandlung wurde korrigiert.

Für diese Strategy wird

```yaml
kiosk_mode:
  hide_header: true
```

jetzt absichtlich auf den bei diesem Dashboard nachweislich funktionierenden
Kiosk-Mode-Schalter `?kiosk` abgebildet.

Die Strategy ergänzt den Parameter automatisch; manuelles Anhängen ist nicht
mehr nötig.


## v0.84 Zuverlässiger Kiosk-Start

Bei Strategy-Dashboards kann Home Assistant den Block `kiosk_mode:` aus der
Konfiguration herausfiltern, bevor er an die Strategy übergeben wird.

Deshalb gibt es jetzt einen Strategy-eigenen Schalter:

```yaml
force_kiosk: true
```

Damit ergänzt die Strategy automatisch den bei diesem Dashboard getesteten
Kiosk-Mode-Schalter `?kiosk`.

Die bisherige Kiosk-Mode-Konfiguration kann zusätzlich stehen bleiben:

```yaml
kiosk_mode:
  hide_header: true
force_kiosk: true
```

## HACS-Versionen

Nach erfolgreicher HACS-Validierung erzeugt der gleiche GitHub-Actions-Workflow
automatisch einen GitHub Release mit der aktuellen `ATZE_VERSION`.
Dadurch kann HACS statt eines Commit-Hashes eine Versionsnummer wie
`v0.84.0` anzeigen.


## v0.85 Header-only Kiosk

`force_kiosk: true` blendet jetzt nur noch den Home-Assistant-Header aus.
Die Sidebar bleibt erreichbar.

Die Strategy verwendet dafür den offiziellen Kiosk-Mode-Parameter
`?hide_header`.

Falls eine ältere Strategy-Version bereits automatisch `?kiosk` zusammen mit
`atze_km_auto=1` gesetzt hat, migriert v0.85 die URL automatisch auf
`?hide_header`.


## v0.86 Sidebar-Zugriff bei ausgeblendetem Header

Home Assistant hat seit 2023.4 keine native Swipe-Geste mehr, um die Sidebar
zu öffnen, wenn der Header beziehungsweise der Menüknopf ausgeblendet ist.

Bei `force_kiosk: true` blendet die Strategy daher weiterhin nur den Header
aus und zeigt zusätzlich einen kleinen Menüknopf oben links. Dieser öffnet die
native Home-Assistant-Sidebar über `hass-toggle-menu`.

Die Dashboard-Konfiguration bleibt unverändert:

```yaml
type: custom:atze-dashboard
force_kiosk: true
```


## v0.87 Dezenter Menüknopf

Der zusätzliche Sidebar-Menüknopf bei `force_kiosk: true` wurde optisch
deutlich zurückgenommen: kleiner, ohne harten Rand und ohne starken Schatten,
damit er sich besser in das Apple-Home-inspirierte Dashboard einfügt.


## v0.88 Icon-only Menüknopf

Der zusätzliche Sidebar-Menüknopf wird jetzt ohne Kreis, Hintergrund oder
Schatten dargestellt. Sichtbar ist nur noch das dezente Menü-Icon. Die
Touch-Fläche bleibt mit 40 x 40 px ausreichend groß.
