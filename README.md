# Atze Dashboard Strategy

<sub>KI-Generiert: ChatGPT</sub>

![Atze Dashboard Strategy](dist/assets/wohnzimmer.jpg)

Eine automatische Home-Assistant-Dashboard-Strategy im Apple-Home-inspirierten
Stil. Räume und Entities werden automatisch aus Home Assistant erzeugt und über
YAML-Overrides angepasst.

## Aktueller Stand

Version **0.154.0**

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

### v0.154.0

- Unter **Darstellung** lässt sich der Startseitenpunkt **Zeitpläne** ein- oder
  ausschalten.
- **Zeitpläne** öffnet nun ein Bubble-Card-Popup, dessen erste Karte eine
  Scheduler Card ist, statt eine zusätzliche Dashboard-Seite aufzurufen.
- Bereits vorhandene Zeitpläne-Seiten mit Scheduler Card werden automatisch in
  das neue Popup übernommen.

### v0.153.0

- Die sechs Symbole auf der Hauskarte sind wieder optisch vertikal in ihren
  Statuskacheln zentriert.
- In der Batterieansicht bleibt die Statusschrift unabhängig vom Ladestand weiß.
- Der Batteriestatus zeigt nun zuerst den Prozentwert und danach den Bereich,
  beispielsweise **48 % · Balkon**.

### v0.152.0

- Das Hausbild der sechs Statuskacheln wird mit einer schwächeren Abdunklung
  sichtbar heller dargestellt.
- Die Batterieansicht verwendet die Grenzen **41–100 % grün**,
  **21–40 % orange** und **0–20 % rot** und trennt sie in drei Abschnitte.
- Die Ausschlusslabels **no-strategy** und **no-dboard** gelten nun auch direkt
  für einzelne Entitäten, einschließlich der Sicherheitsansicht.
- Eine versehentlich auf Sicherheitsentitäten angewendete Batteriesortierung
  wurde entfernt.

## Lizenz

MIT
