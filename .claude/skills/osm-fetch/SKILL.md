---
name: osm-fetch
description: >
  Gebruik deze skill om kaartdata (rivieren, zeeën, gewesten, regio's, landen) uit
  OpenStreetMap te halen, te chainen tot bruikbare polygonen/lijnen, te simplificeren,
  en in `wateren.geojson` / `gewesten.geojson` / `landen-europa.geojson` te zetten.
  Triggers: "haal rivier uit OSM", "haal gewest uit OSM", "nieuwe polygoon", "Overpass",
  "fetch <naam> uit OSM", "voeg <rivier/gewest/land> toe aan de kaart", "overpass query".
---

# OSM Overpass fetch + chain skill

Bouwt op het bestaande pipeline-patroon in `data/fetch-*.js` + `data/process-*.js`. Respecteert Overpass rate limits en produceert polygonen/lijnen die meteen in de juiste `*.geojson` passen.

## ⚠️ Deze skill is levend — verbeter hem na elke fetch-sessie

Elke keer dat we OSM-data ophalen leren we iets nieuws: een onverwachte naamvariant, een bbox die niet werkt, een rate-limit-truc, een chain-parameter die bij een bepaald riviertype anders moet, een valkuil in een bestaand feature-type. **Schrijf die learning terug in dit bestand** vóór je de sessie afsluit, zodat de volgende fetch meteen profiteert.

Concreet:
- **Nieuwe taalvalkuil?** → Voeg een rij toe aan de "Taalvalkuilen" tabel.
- **Nieuwe query-vorm die werkte?** → Voeg een rij toe aan de "Kies het query-type" tabel.
- **Rate-limit-patroon dat je hebt ontdekt?** → Update stap 3 "Draai het fetch-script".
- **Chain/RDP parameter die bij een bepaald feature-type afwijkt?** → Update stap 4 "Verwerk de JSON".
- **Bug die je in de geojson-merge-logica tegenkwam?** → Voeg toe aan "Hard no's".
- **Iets dat fundamenteel niet werkte?** → Leg uit *waarom* niet, zodat we het niet opnieuw proberen.

Minimaliseer verspreiding: als een learning al in `project_osm_pipeline.md` memory past (evergreen OSM-feiten die niet alleen dit script betreffen), zet hem dáár neer en verwijs vanaf hier. Anders direct in deze skill.

## Wanneer inzetten

- Nieuwe rivier toevoegen (bijv. Loire, Seine, Rijn)
- Nieuw gewest, regio of land als polygoon toevoegen (bijv. Bretagne, Baskenland, Estland)
- Bestaande polygoon verbeteren (bijv. Luxemburg 7 pt → 156 pt)
- Zee/waterlichaam met grens (bijv. Waddenzee)

**Niet** inzetten voor: puntdata (steden), die hoort gewoon handmatig in `cities.js`.

## Vereiste input (vraag de gebruiker als nog niet duidelijk)

1. **Wat?** — naam + type (rivier / gewest / regio / land / zee)
2. **Doel-bestand?** — `wateren.geojson` (rivieren, zeeën), `gewesten.geojson` (gewesten, regio's), `landen-europa.geojson` (landen)
3. **In welke set(s)?** — voor de `sets: [...]` property op de feature
4. **Nederlandse naam?** — wat komt er in `properties.name`; dit moet matchen met de entry in `cities.js` (`ALL_WATERS`, `ALL_PROVINCES`, `ALL_COUNTRIES`)

## Het patroon

```
fetch-<naam>.js (rate-limited) → data/overpass/<naam>.json → process-<naam>.js (chain+RDP) → *.geojson
```

Gebruik altijd een **nieuw** fetch-script per taak (bijv. `fetch-loire.js`) of breid een bestaand script uit met een nieuwe query-entry — nooit inline in de shell. Zo blijft de query reproduceerbaar en is een rerun triviaal.

## De stappen

### 1. Kies het query-type

| Doel | Query-template | Waarom |
|---|---|---|
| Rivier (middelgroot, NL/DE) | `way["name"="<Name>"]["waterway"="river"](bbox);out geom qt;` | Snel, losse way-segmenten die chain() plakt |
| Rivier (FR, verplicht lidwoord) | `way["name"="La Seine"]...` / `way["name"="Le Rhône"]...` | OSM gebruikt lokale naam mét lidwoord |
| Rivier als relatie | `relation["name"="<Name>"]["waterway"="river"];out geom qt;` | Voor rivieren waar losse ways te moeilijk te chainen zijn, maar kan rate-limit raken |
| Admin-grens (gewest, regio, land) | `relation["name"="<Name>"]["admin_level"="<N>"]["boundary"="administrative"];out geom qt;` | admin_level: 2=land, 4=provincie/staat, 6=arrondissement |
| Zee / waterlichaam met grens | `relation["name"="<Name>"];out geom qt;` | Multipolygon met de randen van dat specifieke waterlichaam |

**Bbox** voor way-queries: `(south,west,north,east)` in decimale graden. Houd hem krap om irrelevante matches te voorkomen, maar ruim genoeg om de hele feature te dekken.

### 2. Schrijf het fetch-script

Kopieer de structuur van `data/fetch-set73.js`:
- `waitForSlot()` checkt `https://overpass-api.de/api/status` — draai pas de query als er een slot vrij is
- `hasValidData()` voorkomt overbodige re-fetches als het JSON-bestand al bestaat en geldig is
- POST naar `/api/interpreter` met `[out:json][timeout:90];` als prefix
- Schrijf naar `data/overpass/<name>.json`
- Tussen queries: `await sleep(2000)` zodat de server niet bokkt

### 3. Draai het fetch-script

```bash
node data/fetch-<naam>.js
```

- Bij **rate limit**: het script wacht automatisch op een slot. Laat het draaien.
- Bij **429 Too Many Requests**: sleep verhogen of queries splitsen over meerdere runs.
- Bij **0 elementen**: meestal een naamfout. Check of OSM-naam matcht (zie taalvalkuilen in [project_osm_pipeline.md](../../../memory/project_osm_pipeline.md)).
- Bij **HTML response i.p.v. JSON**: server overbelast; opnieuw proberen met langere wachttijd.

### 4. Verwerk de JSON

Kopieer de structuur van `data/process-set73.js`. Cruciale functies die altijd hergebruikt kunnen worden:

- **`chain(ways, maxGap=0.05)`** — bidirectioneel: probeert eerst aan de staart een volgende segment te plakken, dan aan de kop. `maxGap` in decimale graden; verhoog tot `2.0` voor rivieren met brede bochten (Loire).
- **`rdp(points, eps)`** — Ramer-Douglas-Peucker simplificatie. `eps`:
  - NL-schaal rivieren: `0.001–0.003`
  - EU-schaal polygonen: `0.005`
  - NL-provincie-detail: `0.003`
- **`processRiver(file, nlName, sets, eps, maxGap)`** — handelt zowel way-based als relation-based data af. Voor relaties filtert hij `m.role === 'main_stream'` (val terug op alle way-members als de relatie geen role gebruikt).
- **`processRegion(file, nlName, sets, eps=0.005)`** — filtert `m.role !== 'inner'` voor de outer ring, sluit het polygoon en voegt het startpunt weer toe als de chain niet al gesloten is.

### 5. Voeg het bestand in de juiste `*.geojson` in

Gebruik de merge-logica uit `process-set73.js`: zoek op `feature.properties.name` in het doelbestand. Bestaat die al → vervang. Bestaat niet → push. Schrijf het hele bestand terug met `JSON.stringify(data)` (compact, geen pretty-print — dat houdt diffs klein).

**Belangrijk**: zet de `sets` property goed. Zonder `sets` valt het feature bij een gefaseerde set buiten de filter en verdwijnt het. Zie de Luxemburg-bug (commit `6e0a4b2`) voor wat er misgaat.

### 6. Deploy-allow-list check

Als je een **nieuw** top-level `*.geojson` bestand hebt aangemaakt (niet alleen een update aan een bestaand bestand): voeg het toe aan `.github/workflows/e2e.yml` `switches:` rsync-include, anders wordt het stilzwijgend niet naar productie gedeployed. Dit is de architecturale valkuil die de Luxemburg-deploy-bug heeft veroorzaakt.

### 7. Test en verifieer

1. **`npm test`** — bestaande tests moeten groen blijven (let op `test.js` ALL_WATERS/ALL_PROVINCES counts).
2. **Lokaal visueel** — `npx serve .`, open de set, kijk of de polygoon klopt.
3. **Nieuwe regressietest** — overweeg een test die bevestigt dat de polygoon minimaal X punten heeft (vergelijkbaar met `tests/set72.spec.js` Luxemburg-test).
4. **Debug-viewer** — voor wateren: gebruik `debug-wateren.html` + Playwright screenshots zoals beschreven in `project_water_debug.md`.

## Taalvalkuilen — snelreferentie

| Feature | OSM-naam |
|---|---|
| Seine, Loire, Rhône | `"La Seine"`, `"La Loire"`, `"Le Rhône"` (verplicht lidwoord) |
| Belgische Maas (Wallonië) | `"Meuse"` / `"La Meuse"` — match op `name:nl=Maas` of bbox+regex |
| Rijn in DE | `"Rhein"` (niet `"Rijn"`) |
| Corsica | `"Corse"` |
| Balearen | `"Illes Balears"` — bevat Mallorca + Menorca + Ibiza samen; mogelijk apart Mallorca-eiland nodig |
| Bergsche Maas, Nederrijn | bare NL-naam, OSM matcht deze exact |

## Hard no's

- **Nooit** Overpass-queries direct in de shell uitvoeren zonder `waitForSlot()` — rate limit knalt eruit.
- **Nooit** een nieuw top-level `*.geojson` toevoegen zonder `.github/workflows/e2e.yml` bij te werken.
- **Nooit** een polygoon in `gewesten.geojson` zetten zonder `sets: [...]` property — dan faalt de filter in gefaseerde sets.
- **Nooit** coastline-ways via bbox proberen te chainen voor zeeën — gebruik multipolygon relations. (#37 is op deze manier twee keer mislukt.)
- **Nooit** bestaande fetch-scripts overschrijven voor een nieuwe taak — maak een nieuw script zodat reruns reproduceerbaar blijven.

## Vervolgacties na skill-afloop

- Als je aan een set werkt (bijv. set 7.3): update `cities.js` met de bijpassende entry in `ALL_WATERS` / `ALL_PROVINCES` / `ALL_COUNTRIES`.
- Rond af via de `release` skill.
