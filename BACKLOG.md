# Topo Quiz – Backlog

## Projecteisen & doelgroep

- **Doelgroep:** kinderen in groep 5 van de basisschool (~8-9 jaar)
- **Taalgebruik:** eenvoudig, kort, positief — geen jargon
- **Kaart:** moet herkenbaar zijn voor kinderen; vertrouwde, lichte kaartstijl is vereist — donkere of abstracte kaarten zijn NIET geschikt
- **UI:** overzichtelijk, grote knoppen, weinig afleiding

## Bugs / verbeteringen

- [ ] **Teksten op niveau** — pas taalgebruik en feedback aan de doelgroep aan (groep 5, ~8-9 jaar).
- [ ] **Beter leesbare kaart** — huidige CARTO-kaart toont lands- en provinciegrenzen slecht. Voor groep 5 zijn die grenzen essentieel als oriëntatiepunt.

## Features

- [x] **Dot size op bevolking** — populatiedata toevoegen aan `CITIES` en de `radius` van de markers schalen op basis van inwoneraantal.
- [x] **Vrije tekstinvoer** — naast meerkeuze een modus waarbij de speler de stadsnaam intypt. Spellingsvarianten per stad definiëren (bijv. `'s-Hertogenbosch` / `Den Bosch`). Modus te kiezen op het startscherm.
- [ ] **Level/set kiezer** — steden groeperen per toets/hoofdstuk, zodat je gericht kunt oefenen voor een specifieke toets.


## Changelog

### 2026-03-11 (vervolg 2)
- Tekstinvoer-modus toegevoegd naast meerkeuze (keuze op startscherm)
- Hints: per klik één extra letter onthullen (max helft van de naam)
- Fuzzy matching: 1-2 typefouten geaccepteerd afhankelijk van naamlengte, feedback "Bijna!"
- Aliassen toegevoegd in `cities.js` (bijv. Den Bosch, 's-Gravenhage)
- Levenshtein-normalisatie: apostrofs, koppeltekens en spaties genegeerd

### 2026-03-11 (vervolg)
- Stadsdata (naam, coördinaten, bevolking, set-nummers) verplaatst naar `cities.js`
- Radius-berekening gebaseerd op globale min/max over alle steden (consistent over sets)
- `index.html` filtert steden op `sets.includes(1)`

### 2026-03-11
- Spel gaat automatisch door na 2s (was: klikken op "Volgende →")
- Focus wordt gereset bij nieuwe vraag zodat geen antwoord voorgeselecteerd lijkt
