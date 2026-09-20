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

### v0.148.0

- Seitennavigation und Favoriten werden in einer gemeinsamen abgerundeten
  Serverraum-Karte dargestellt.
- Der dunkle Technikraum-Hintergrund sowie gläserne Buttons und Favoritenkarten
  bilden eine optische Brücke zwischen Hausstatus und Raumbildern.
- Unter dem Projekttitel weist die README nun mit **KI-Generiert: ChatGPT** auf
  die Entstehung des Dashboards hin.

### v0.147.0

- Profil, Uhrzeit und die sechs Statuskacheln erhalten eine gemeinsame
  Hausansicht als Hintergrund.
- Von **07:00 bis 19:59 Uhr** wird automatisch die helle Tagversion verwendet;
  von **20:00 bis 06:59 Uhr** erscheint die dunkle Nachtversion.
- Verlauf, Glasoptik und Kontrast sorgen in beiden Varianten für gut lesbare
  Texte und Statuswerte.

### v0.146.0

- Die Symbole innerhalb der blauen Bereichs-Bubbles verwenden ein dunkleres,
  kräftigeres Blau und bleiben dadurch auch auf hellen Raumbildern gut sichtbar.

## Lizenz

MIT
