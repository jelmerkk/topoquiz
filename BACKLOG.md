# Topo Quiz – Backlog

## Projecteisen & doelgroep

- **Doelgroep:** kinderen in groep 5 van de basisschool (~8-9 jaar)
- **Taalgebruik:** eenvoudig, kort, positief — geen jargon
- **Kaart:** moet herkenbaar zijn voor kinderen; vertrouwde, lichte kaartstijl is vereist — donkere of abstracte kaarten zijn NIET geschikt
- **UI:** overzichtelijk, grote knoppen, weinig afleiding

## Open

- [ ] **Dot size op bevolking** — populatiedata toevoegen aan `CITIES` en de `radius` van de markers schalen op basis van inwoneraantal.
- [ ] **Vrije tekstinvoer** — naast meerkeuze een modus waarbij de speler de stadsnaam intypt. Spellingsvarianten per stad definiëren (bijv. `'s-Hertogenbosch` / `Den Bosch`). Modus te kiezen op het startscherm.
- [ ] **Level/set kiezer** — steden groeperen per toets/hoofdstuk, zodat je gericht kunt oefenen voor een specifieke toets.
- [ ] **Open-source kaarttiles zonder plaatsnamen** — huidige topomania.net tiles vervangen door een vrij beschikbare alternatief dat geen stadsnamen toont. Kandidaten om te evalueren:
  - [CARTO Positron No Labels](https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png) — licht, schoon, gratis met attributie
  - [CARTO Dark Matter No Labels](https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png) — donker, past goed bij huidige UI
  - [Stadia Maps Alidade Smooth](https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png) — vereist gratis API-key, heeft no-labels variant
  - Overwegingen: licentie (CC BY), schaalbaarheid, visuele stijl passend bij donker thema

## Changelog

### 2026-03-11
- Spel gaat automatisch door na 2s (was: klikken op "Volgende →")
- Focus wordt gereset bij nieuwe vraag zodat geen antwoord voorgeselecteerd lijkt
