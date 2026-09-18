# Atze Dashboard Strategy

![Atze Dashboard Strategy](dist/assets/wohnzimmer.jpg)

Eine automatische Home-Assistant-Dashboard-Strategy im Apple-Home-inspirierten
Stil. Räume und Entities werden automatisch aus Home Assistant erzeugt und über
YAML-Overrides angepasst.

## Aktueller Stand

Version **0.112.0**

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


## v0.89 Bereiche mit no-strategy ausblenden

Ein Home-Assistant-Bereich wird automatisch vollständig von der Strategy
ausgeschlossen, wenn der **Bereich selbst** das Label `no-strategy` trägt.

Dafür ist keine zusätzliche Dashboard-YAML nötig.

Der Bereich erscheint dann nicht mehr:

- auf der Startseite,
- als eigene Raumansicht,
- in der Sicherheitsansicht,
- in der Wartungs-/Batterieansicht,
- und seine Entities fließen auch nicht mehr in die Strategy-Auswertung ein.

Optional kann der verwendete Labelname geändert werden:

```yaml
no_strategy_label: no-strategy
```

Standard ist `no-strategy`.


## v0.90 Grafische Dashboard-Einstellungen

Die Strategy besitzt jetzt einen grafischen Editor, ähnlich dem Prinzip der
Simon42 Dashboard Strategy.

Im Dashboard-Editor können die wichtigsten Einstellungen ohne YAML geändert
werden:

- sichtbare Räume/Bereiche auswählen,
- Startseite ein-/ausschalten,
- Sicherheitsansicht ein-/ausschalten,
- Wartungsansicht ein-/ausschalten,
- Raumansichten als Unterseiten konfigurieren,
- Header-Ausblendung über `force_kiosk`,
- Scrollbalken ein-/ausblenden.

Bereiche mit dem Label `no-strategy` werden im Editor angezeigt, sind aber
deaktiviert und bleiben unabhängig von der Auswahl ausgeschlossen.

Die Raumauswahl schreibt weiterhin die bestehende Option
`include_areas`, sodass bestehende YAML-Konfigurationen kompatibel bleiben.


## v0.91 Raum-Reihenfolge per Drag & Drop

Im grafischen Strategy-Editor können Räume jetzt per Drag & Drop sortiert
werden. Dazu besitzt jede Raumzeile links einen Drag-Griff.

Die Reihenfolge wird nicht in einer neuen Sonderoption gespeichert, sondern in
der bereits vorhandenen Konfiguration:

```yaml
area_overrides:
  wohnzimmer:
    order: 10
  kuche:
    order: 20
```

Vorhandene weitere Eigenschaften eines `area_overrides`-Eintrags bleiben
erhalten.

Über **Reihenfolge zurücksetzen** werden nur die automatisch gesetzten
`order`-Werte entfernt; Namen, Icons, Spalten-Einstellungen und andere
Overrides bleiben bestehen.


## v0.92 Kiosk über die Uhrzeit umschalten

Auf der Zuhause-Übersicht kann die Uhrzeit jetzt als unsichtbarer Kiosk-Schalter
verwendet werden.

- Tippen auf die Uhrzeit im Kiosk-Modus: Home-Assistant-Header wird eingeblendet.
- Noch einmal auf die Uhrzeit tippen: Header wird wieder ausgeblendet.
- Die Seite lädt dabei kurz neu, damit Kiosk Mode die Query-Parameter sicher neu
  einliest.
- Solange diese Funktion aktiv ist und eine Startseite vorhanden ist, wird der
  zusätzliche Atze-Sidebar-Menüknopf nicht mehr angezeigt.

Im grafischen Strategy-Editor gibt es dafür unter **Darstellung** den Schalter
**Kiosk über Uhrzeit umschalten**.

Die Funktion ist standardmäßig aktiviert und kann auch per YAML abgeschaltet
werden:

```yaml
clock_kiosk_toggle: false
```


## v0.93 Thermostat-Zusatzwerte wieder im Popup

Thermostat-Zusatzwerte wie Batterie, Spannung, Temperatur, Fensterstatus,
Kalibrierung, Betriebszustand und Problemstatus werden wieder konsequent hinter
dem Thermostat-Popup zusammengefasst.

Dafür werden `sensor` und `binary_sensor` jetzt standardmäßig als
Climate-Popup-Kinder berücksichtigt. Zusätzlich gibt es einen Fallback über den
Entity-ID-Präfix, falls Home Assistant die Zusatz-Entities nicht exakt demselben
Gerät wie die Climate-Entity zuordnet.

Die Zusatzwerte verschwinden dadurch aus den normalen Raumgruppen wie
**Sensoren** und **Sicherheit**, bleiben aber weiterhin unter
**Thermostat → Einstellungen** erreichbar.


## v0.94 Batteriesensoren aus Raumansichten ausblenden

Batterie-Entities von Sensoren werden nicht mehr als normale Karten im Bereich
**Sensoren** eines Raums angezeigt.

Erkannt werden standardmäßig Sensoren mit `device_class: battery` sowie
typische Namen wie `Batterie`, `Battery` oder `Akku`.

Die Entities bleiben weiterhin vollständig in der Wartungs-/Batterieansicht
verfügbar.

Falls Batterie-Sensoren ausnahmsweise wieder in Raumansichten erscheinen
sollen:

```yaml
hide_battery_sensors_in_rooms: false
```


## v0.95 Technische Gerätesensoren aus Raumansichten ausblenden

Technische Gerätesensoren werden in normalen Raumansichten weiter reduziert.

Standardmäßig ausgeblendet werden:

- Sensoren mit `device_class: voltage`
- Entity-IDs mit `_voltage`
- Entity-IDs mit `device_temperature`

Echte Raumtemperatur-Sensoren bleiben sichtbar.

Falls diese Filterung ausnahmsweise deaktiviert werden soll:

```yaml
hide_technical_sensors_in_rooms: false
```


## v0.96 Keypad Vision aufräumen

Entities des SwitchBot Keypad Vision werden strategyweit ausgeblendet, wenn
ihre Entity-ID `keypad_vision` beziehungsweise `keypadvision` enthält.

Eine bewusste Ausnahme bleibt sichtbar:

```text
binary_sensor.keypad_vision_725e_manipulation
```

Damit bleibt der Manipulationsstatus unter **Sicherheit** erhalten, während
technische und diagnostische Keypad-Vision-Entities wie Ladestatus,
Temperaturwarnungen, PIR-Level, letzte Aktivität und ähnliche Werte nicht mehr
in Raum-, Sicherheits- oder Wartungsansichten erscheinen.


## v0.97 Flur Letzte Aktivität ausblenden

Der Sensor

```text
sensor.flur_haustur_letzte_aktivitat
```

wird in den generierten Ansichten ausgeblendet. Weitere Flur-Sensoren bleiben
unverändert.


## v0.98 Strenge Automatik plus Entity-Overrides

Die Raumansichten arbeiten jetzt nach dem Prinzip **strenge Automatik +
explizite Overrides**.

Im Auto-Modus werden standardmäßig typische Bedienelemente wie Licht, Schalter,
Rollläden, Klima, Lüfter, Schloss, Media Player und Helfer angezeigt.
Technische Sensorwerte, Regler, Auswahl-Entities und Diagnosewerte erscheinen
nicht mehr automatisch als eigene Raumkarten. Sie bleiben weiterhin für
Badges, Geräte-Popups und die Wartungsansicht verfügbar.

Sinnvolle Sicherheits-Binary-Sensoren wie Fenster/Tür, Rauch, Feuchtigkeit,
Gas, CO und Manipulation können weiterhin automatisch erscheinen.

Im grafischen Strategy-Editor gibt es jetzt **Entitäten pro Raum**. Für jede
Entity stehen drei Zustände zur Verfügung:

- **Auto** – die Strategy entscheidet nach der neuen strengen Automatik
- **Anzeigen** – Entity immer als Raumkarte anzeigen
- **Ausblenden** – Entity nicht als Raumkarte anzeigen

Die Einstellung wird unter `entity_overrides` gespeichert:

```yaml
entity_overrides:
  sensor.mein_spezialsensor:
    visibility: show
  binary_sensor.irgendwas:
    visibility: hide
```

Die strenge Automatik ist standardmäßig aktiv. Für einen vorübergehenden
Rückweg zum breiteren alten Verhalten:

```yaml
strict_room_entity_auto: false
```


## v0.99 Neue Kachelbilder

Die HACS-Installation enthält jetzt zwei weitere integrierte Bereichsbilder:

- **3D-Drucker** – `dist/assets/3d-drucker.webp`
- **Zentrale** – `dist/assets/zentrale.webp`

Die Strategy ordnet die Bilder automatisch anhand der Area-ID oder des
normalisierten Bereichsnamens zu. Dadurch funktionieren unter anderem
`3d_drucker`, `3d-drucker` und der Bereichsname **3D-Drucker** ohne
zusätzliche YAML-Konfiguration.

Für **Zentrale** wird das Bild bei der Area-ID beziehungsweise dem
Bereichsnamen `zentrale` automatisch verwendet.


## v0.100 HomeBase-Live-Fallback und Raum-Akkordeons

Der Status von **AtzeHomeBase** wird jetzt nicht mehr nur beim Erzeugen der
Dashboard-Konfiguration festgelegt. Die Home-Übersicht erhält mehrere passende
HomeBase-Status-Entities und wählt bei jedem Rendern den ersten tatsächlich
verfügbaren Status.

Eine explizit konfigurierte Entity wie

```yaml
home_homebase_entity: select.atzehomebase_guard_mode
```

bleibt bevorzugt, wird aber nicht mehr verworfen, wenn ihr Zustand beim
Dashboard-Start noch nicht angekommen ist. Falls sie vorübergehend
`unknown` oder `unavailable` ist, kann die Karte auf einen passenden
HomeBase-Fallback ausweichen. Dadurch sollte kein manueller Seiten-Reload mehr
nötig sein.

Im grafischen Strategy-Editor sind die Abschnitte unter **Entitäten pro Raum**
jetzt als deutliche Akkordeons aufgebaut:

- Raum antippen zum Aufklappen
- erneut antippen zum Zuklappen
- Pfeil zeigt den Zustand
- geöffnete Räume bleiben auch bei Editor-Neurendern geöffnet


## v0.101 Einklappbare Setup-Bereiche

Die Hauptbereiche im grafischen Strategy-Editor sind jetzt vollständig
ein- und ausklappbar:

- **Räume**
- **Entitäten pro Raum**
- **Ansichten**
- **Darstellung**

Jeder Abschnitt besitzt einen Pfeil rechts und kann durch Antippen der
Überschrift geöffnet oder geschlossen werden.

Beim ersten Öffnen des Editors sind alle Hauptbereiche weiterhin geöffnet.
Während der Bearbeitung bleibt der jeweilige Offen-/Geschlossen-Zustand auch
bei automatischen Neurendern erhalten.


## v0.112 Zusätzliche Schnellaktionen

Unter den Raumkarten stehen jetzt vier globale Grundaktionen zur Verfügung:

- **Lichter aus**
- **Rollläden zu**
- **Lichter an**
- **Rollläden auf**

Im Smartphone-Layout erscheinen sie als übersichtliches 2×2-Raster.

## v0.111 Kein automatischer Kiosk-Neustart

Beim normalen Öffnen des Dashboards werden keine Kiosk-Parameter mehr
automatisch an die URL angehängt. Dadurch entfällt der vollständige
Frontend-Neustart mit dem Home-Assistant-Bootlogo.

Der virtuelle Schalter in der Uhr bleibt erhalten. Nur beim bewussten
Umschalten des Kiosk-Modus über die Uhr wird die Seite weiterhin einmal neu
geladen, damit der geänderte Modus wirksam wird.

## v0.110 Stabile Auswahl der Entity-Sichtbarkeit

Das Auswahlmenü für **Auto**, **Anzeigen** und **Ausblenden** bleibt jetzt
während laufender Home-Assistant-Aktualisierungen geöffnet. Eine Aktualisierung
des Editors wird bis zum Ende der Auswahl zurückgestellt.

Nach einer Änderung bleibt außerdem der zuvor aufgeklappte Raumabschnitt
geöffnet.

## v0.109 Symbole weiter nach unten versetzt

Die Symbole der sechs Status-Kacheln wurden von 2 auf 6 Pixel vertikalen
Versatz eingestellt. Schrift, Zeilenhöhe und Textabstand bleiben gegenüber
Version 0.108 unverändert.

## v0.108 Ausrichtung der Status-Kacheln

Die Symbole der sechs Status-Kacheln wurden für eine optisch mittige
Ausrichtung um 2 Pixel nach unten verschoben. Der Abstand zwischen Haupt- und
Unterzeile beträgt jetzt nur noch 1 Pixel; zusätzlich wurden die Zeilenhöhen
kompakter eingestellt.

## v0.107 Noch kompaktere Status-Kacheln

Die sechs Status-Kacheln wurden nochmals um 10 Pixel verkleinert. Im
Smartphone-Layout beträgt ihre feste Höhe jetzt 56 Pixel, auf größeren
Ansichten 72 Pixel. Der vertikale Innenabstand wurde passend auf 4
beziehungsweise 6 Pixel reduziert.

## v0.106 Reduzierter Innenabstand

Der vertikale Innenabstand der sechs Status-Kacheln wurde oben und unten jeweils
um 5 Pixel reduziert. Dadurch erreichen die Kacheln nun zuverlässig die
vorgesehene Höhe von 82 Pixeln beziehungsweise 66 Pixeln im Smartphone-Layout.
Der seitliche Innenabstand bleibt unverändert.

## v0.105 Kompaktere Status-Kacheln

Die sechs Status-Kacheln unter dem Kopfbereich sind jetzt 10 Pixel niedriger.
Breite, Abstände, Symbole und Schriftgrößen bleiben unverändert.

## v0.104 Lichtschalter auf den Raumkarten

Raumkarten mit zugeordneten Licht-Entities zeigen oben mittig einen runden
Lampen-Schalter. Ein Tipp schaltet alle Lichter des jeweiligen Raums gemeinsam
ein oder aus, ohne die Raumansicht zu öffnen.

Leuchtet mindestens eine Lampe im Raum, wird das Symbol gelb hervorgehoben.
Ausgeschaltete Räume zeigen eine dezente graue Lampenkontur. Raumkarten ohne
zugeordnetes Licht bleiben unverändert.

## v0.103 Statusanzeige ohne Symbole

Im grafischen Strategy-Editor bleibt der farbige Text **Sichtbar** beziehungsweise
**Unsichtbar** erhalten. Die Augen-Symbole wurden entfernt, damit die Statuszeile
ruhiger und übersichtlicher wirkt.

## v0.102 Effektiver Sichtbarkeitsstatus

Im grafischen Strategy-Editor zeigt jede Entity jetzt direkt unter ihrem Namen
den aktuell wirksamen Sichtbarkeitsstatus:

- **Sichtbar**
- **Unsichtbar**

Zusätzlich wird klein angezeigt, ob dieser Zustand aus **Auto**, **Anzeigen**
oder **Ausblenden** entsteht. Die Auswahl selbst bleibt weiterhin über das
Dropdown steuerbar.
