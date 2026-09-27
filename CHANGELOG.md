# Changelog

## v0.328.0
- Die horizontal scrollbare Leiste der eigenen Seiten springt nach 10 Sekunden ohne weitere Interaktion weich zum ersten Eintrag zurück.
- Weiteres Scrollen oder Berühren startet die 10 Sekunden erneut.

## v0.327.0
- Fokusproblem der nativen Icon- und Navigationsauswahl behoben.
- `setConfig()` baut den Editor während einer geöffneten Navigationsauswahl nicht mehr neu auf.
- Die Auswahl bleibt auch dann aktiv, wenn Home Assistant den Selector-Dialog außerhalb des Strategy-Shadow-DOM rendert.
- Nach einer Auswahl wird die Ansicht kontrolliert aktualisiert.

## v0.326.0
- Fokusverlust der Tastatur beim Bearbeiten von Navigations-Einträgen behoben.
- Icon-Auswahl auf den nativen Home-Assistant Icon-Selector umgestellt.
- Ziel-Auswahl auf den nativen Home-Assistant Navigation-Selector umgestellt.
- Navigationseingaben werden gespeichert, ohne den Editor bei jedem Tastendruck neu aufzubauen.

## v0.325.0
- Navigations-Einträge erhalten eine kompakte, mobile Eingabemaske statt des YAML-Editors.
- Name, Icon und Ziel können direkt über drei Eingabefelder geändert werden.
- Normale eigene Seiten behalten weiterhin den YAML-Editor.

## v0.324.0
- Speichern von Navigations-Einträgen im Editor korrigiert.
- Navigations-Einträge werden jetzt an die Startseite übergeben und dort als Button angezeigt.
- `navigation_path` bleibt ein direkter interner Home-Assistant-Link ohne zusätzliche Dashboard-Ansicht.

## v0.323.0
- Unter „Eigene Seiten“ können jetzt reine Navigations-Buttons angelegt werden.
- Neue Navigation startet testweise mit „Geräte“ und `/config/devices/dashboard`.
- Titel, Icon und `navigation_path` können anschließend im YAML-Editor geändert werden.
- Navigations-Einträge erzeugen keine zusätzliche Dashboard-Ansicht.

## v0.322.0
- Flur-Statusbild auf der Hauptseite korrigiert.
- Die Hauptseite berücksichtigt beim Flur nun wie die Bereichsseite den Tag-/Nacht-Präfix bei Tür-, Licht- und Verriegelungszuständen.
- Dadurch wird das passende Verriegelt-Bild wieder zuverlässig ausgewählt.

## v0.321.0
- Automatische Fenster-/Rollladen-Warn-Badges aus den Bereichsbildern entfernt.
- Die Zustände werden bereits über die dynamischen Raum-/Statusbilder dargestellt und bleiben zusätzlich auf der Sicherheitsseite verfügbar.
- Manuell konfigurierte Badges bleiben unverändert möglich.

## v0.320.0
- Verbleibende binäre Status-Badges in den Bereichsbildern auf die eigene Glass-Badge-Komponente umgestellt.
- Damit nutzt insbesondere das Anwesenheits-/Belegungs-Badge denselben Glass-Look wie Temperatur, Luftfeuchtigkeit, Leistung und Rauchmelder.
- Warn-Badges für Fenster/Rollladen behalten ihre separate Warn-Darstellung.

## v0.319.0
- Native Home-Assistant-Entity-Badges in den Bereichsbildern auf die eigene Glass-Badge-Komponente umgestellt.
- Temperatur, Luftfeuchtigkeit, Leistung, Anwesenheit und aggregierte Status-Badges erhalten dadurch denselben Glass-Look.
- Bestehende Iconfarben und More-Info-Verhalten bleiben erhalten.

## v0.318.0
- Glass-Effekt der normalen Raum-Status-Badges korrigiert.
- Eine nachgelagerte `backdrop-filter`-Regel entfernte den 8-px-Blur bei Temperatur, Luftfeuchtigkeit, Leistung und Anwesenheit; diese Überschreibung wurde entfernt.

## v0.317.0
- Den abgestimmten Glass-Look auf die normalen Status-Badges im Raumbild erweitert.
- Temperatur, Luftfeuchtigkeit, Leistung, Anwesenheit und weitere neutrale Badges nutzen nun denselben transparenten Grundton mit 8-px-Blur.
- Warn- und aktive Statusfarben bleiben unverändert erhalten.
- Tag-/Nacht-Umschaltung der Bereichsbilder für 3D-Drucker, Büro und Zentrale repariert.

## v0.316.0
- Den neuen Glass-Look auf Bubble Cards erweitert.
- Inaktive Button-, Climate-, Media-Player-, Select- und Cover-Flächen verwenden nun denselben transparenten Grundton mit 8-px-Blur.
- Aktive Zustände und ihre bisherigen Statusfarben bleiben erhalten.

## v0.315.0
- Den neuen Glass-Look auf die übrigen Button- und Kachel-Elemente des Dashboards ausgerollt.
- Quick Actions, Favoriten, eigene Seiten, Sicherheits-/Batteriekarten und Raum-Badges verwenden nun denselben transparenten Grundstil.
- Bildkarten, große Container und Popups bleiben bewusst unverändert.

## v0.314.0
- Grundfarbe der sechs transparenten Status-Buttons leicht aufgehellt und auf einen ausgewogenen dunklen Glass-Look abgestimmt.
- Transparenz und 8-px-Blur bleiben erhalten; Texte und Icons bleiben vollständig deckend.

## v0.313.0
- Glass-Effekt der sechs Status-Buttons nochmals verstärkt: Hintergrunddeckkraft auf 0,25 reduziert.
- Blur auf 8 px reduziert, damit das Hero-Bild deutlicher durch die Buttons sichtbar bleibt.

## v0.312.0
- Transparenz der sechs Status-Buttons deutlich erhöht, damit der Glass-Effekt klar sichtbar wird.
- Blur von 20 px auf 12 px reduziert; Icons und Texte bleiben vollständig deckend.

## v0.311.0
- Die sechs Status-Buttons im oberen Bereich der Hauptseite erhalten einen dezenten transparenten Glass-Effekt.
- Hintergrundtransparenz und Blur wurden angepasst, während Icons und Texte vollständig deckend bleiben.

## v0.310.0
- README-/Changelog-Synchronisierung korrigiert, sodass die letzten drei Versionen wieder inklusive ihrer Änderungspunkte angezeigt werden.
- Parser für die automatische Übernahme der Changelog-Abschnitte im Build-Prozess korrigiert.

## v0.309.0
- Repository-Qualität verbessert: automatische Asset- und Alias-Prüfungen ergänzt.
- GitHub-Validierung erweitert und doppelte Release-Erstellung entfernt.
- Issue- und Pull-Request-Templates sowie eine `.gitignore` ergänzt.
- README-Struktur überarbeitet; die letzten drei Änderungen werden künftig automatisch aus diesem Changelog synchronisiert.

## v0.308.0
- Empfohlene Raumbenennungen und Asset-Zuordnungen in der README dokumentiert.
- Aliase ergänzt: Arbeitszimmer → Büro, Spielzimmer → Kinderzimmer und Veranda → Balkon.
- Bestehende Zuordnung Treppenhaus/Treppenflur → Hausflur dokumentiert.

## v0.307.0
- Balkon auf acht neue WebP-Statusbilder für Tag/Nacht, Tür offen/geschlossen und Rollladen oben/unten umgestellt.
- Alte Balkonbilder entfernt; Haupt- und Bereichsseite verwenden dieselbe Statuslogik.

## v0.306.0
- Büro, Arbeitszimmer, 3D-Drucker und Zentrale auf eine feste Tag-/Nacht-Bildumschaltung zwischen 07:00 und 20:00 Uhr umgestellt.
