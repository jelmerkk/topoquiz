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
| **Grote rivier (default-keuze)** | `relation["name"="<Name>"]["waterway"="river"];out geom qt;` | Relatie heeft `role=main_stream` vs `side_stream`/`tributary` — filter op main_stream voorkomt dubbellijn-artefact (zie Loire) |
| Kleine rivier (NL, 1–2 segmenten) | `way["name"="<Name>"]["waterway"="river"](bbox);out geom qt;` | Alleen OK als de rivier nauwelijks zijkanalen heeft en je weet dat het hele traject uit enkele ways bestaat |
| Rivier (FR, verplicht lidwoord) | `relation["name"="La Seine"]["waterway"="river"]...` / `...["name"="Le Rhône"]...` | OSM gebruikt lokale naam mét lidwoord |
| Admin-grens (gewest, regio, land) | `relation["name"="<Name>"]["admin_level"="<N>"]["boundary"="administrative"];out geom qt;` | admin_level: 2=land, 4=provincie/staat, 6=arrondissement |
| Zee / waterlichaam met grens | `relation["name"="<Name>"];out geom qt;` | Multipolygon met de randen van dat specifieke waterlichaam |

**Default = relatie voor rivieren.** De way-bbox-query is snel maar heeft een fatale valkuil: bij grote rivieren met parallelle kanalen/zijtakken die dezelfde naam delen (Loire heeft 166 `side_stream` vs 118 `main_stream` leden) levert het een bundel van parallelle lijnen op. `chain()` plakt die dan allemaal aan elkaar en je krijgt een *dubbele* of *zigzag* lijn over het volledige traject — zichtbaar pas bij de debug-screenshot, niet bij punt-telling. De relatie-query met `role=main_stream` filter (al geïmplementeerd in `processRiver()`) produceert één schone hoofdstroom.

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
2. **Visuele verificatie via debug-viewer (VERPLICHT bij nieuwe rivieren)** — zie hieronder.
3. **Nieuwe regressietest** — overweeg een test die bevestigt dat de polygoon minimaal X punten heeft (vergelijkbaar met `tests/set72.spec.js` Luxemburg-test).

### 7a. Debug-screenshot workflow — de enige echte sanity check

Punt-aantallen en endpoint-coördinaten zeggen **niks** over of een chain klopt. Alleen een visuele check tegen OSM-tegels laat zien of de geometrie correct is. Doe dit altijd voordat je merged. Dit geldt net zo goed voor **handmatige polygonen** (Costa Blanca, Elzas, …) — zonder screenshot plak je zomaar een kuststrook in de zee. Gebeurd. Echt.

**Twee permanente debug-viewers** in de repo root:

| Viewer | Rendert | Gebruik voor |
|---|---|---|
| [debug-wateren.html](../../../debug-wateren.html) | `wateren.geojson` (LineStrings rood, polygonen blauw) | Rivieren, zeeën, kanalen, meren |
| [debug-gewesten.html](../../../debug-gewesten.html) | `gewesten.geojson` (alle features blauw) | Gewesten, regio's, eilanden, gebergtes, kuststroken |

Beide tonen de `properties.name` als permanente tooltip in het midden van elke feature, over een OSM-tile-achtergrond. Voor landen: maak `debug-landen.html` op hetzelfde patroon als je `landen-europa.geojson` gaat uitbreiden.

**Uitvoeringssjabloon** — werkt voor beide viewers, pas alleen pad en views aan:

```bash
# Server al draaiend? Check eerst, start anders:
pgrep -f 'serve . -p 8765' >/dev/null || (npx serve . -p 8765 > /tmp/serve.log 2>&1 &)
mkdir -p debug

node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setViewportSize({ width: 1400, height: 900 });
  // Kies: debug-wateren.html of debug-gewesten.html
  await p.goto('http://localhost:8765/debug-wateren.html', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  // Pas center/zoom aan op de feature die je verifieert.
  // Voor rivieren: altijd overzicht + bron + monding. Voor polygonen: overzicht + ingezoomd.
  const views = [
    { name: 'overzicht', lat: 46.5, lon: 1.5,  zoom: 7  },
    { name: 'bron',      lat: 44.9, lon: 4.2,  zoom: 10 },
    { name: 'monding',   lat: 47.3, lon: -2.2, zoom: 10 },
  ];
  for (const v of views) {
    await p.evaluate(({lat,lon,zoom}) => map.setView([lat,lon], zoom), v);
    await p.waitForTimeout(800);
    await p.screenshot({ path: \`debug/<taak>-\${v.name}.png\` });
  }
  await b.close();
})();
"
```

**Daarna**: lees elke PNG met de Read tool — Claude Code toont hem visueel. Vergelijk rode lijn / blauw polygoon tegen de OSM-tegels eronder.

Wat je checkt per view:
- **Rivier — overzicht**: volgt de rode lijn de echte rivier over het hele bbox? Geen sprongen naar andere riviernamen (Seine/Rhône moeten niet "aan de Loire hangen").
- **Rivier — bron**: start de lijn op de juiste plek (vaak in de bergen) en niet ergens in het midden?
- **Rivier — monding**: eindigt de lijn in zee/estuarium? Géén dubbele/zigzag lijnen vlak voor de monding — dat is het klassieke `chain()`-artefact waarbij een zijtak heen-en-weer is gelegd.
- **Polygoon (handmatig OF uit OSM)**: ligt het op de juiste plek *op land/zee zoals bedoeld*? Typische bug bij handmatige kuststroken: coördinaten-volgorde of een te-ver-naar-zee-punt zet de hele strook in het water. Altijd ingezoomd kijken of de bekende steden/landmerken binnen het polygoon vallen.
- **Polygoon — overlapcheck**: als je meerdere features voor één set hebt (Pyreneeën + Andorra + Costa Blanca in 7.3), zoom uit naar overzicht om te zien of ze elkaar niet onbedoeld overlappen op rare plekken.

**Wat zigzag betekent**: `chain(ways, maxGap)` is greedy en bidirectioneel. Als `maxGap` te groot is, plakt hij zijrivieren aan de hoofdstroom via een tributary-mond, loopt de zijrivier op, en keert terug — dat zie je als dubbele lijn. **Oplossing**: verlaag `maxGap` (probeer 0.3 → 0.5 → 1.0) of stap over op `relation["name"="..."]` met `main_stream`-rolfilter.

### 8. Visueel geverifieerd → commit

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
- **Nooit** een rivier releasen zonder debug-screenshot van bron, midden én monding. Punt-aantal en endpoint-coördinaten zijn géén bewijs van correctheid — de Loire had 326 pts en plausibele lat-bbox terwijl de hele lijn verdubbeld was.
- **Nooit** een handmatig polygoon (kuststrook, gebergte, woestijn) releasen zonder `debug-gewesten.html` screenshot op ingezoomd niveau. Eerste versie van Costa Blanca plakte volledig in de Middellandse Zee — dat was onzichtbaar in cijfers, glashelder in de screenshot.

## Vervolgacties na skill-afloop

- Als je aan een set werkt (bijv. set 7.3): update `cities.js` met de bijpassende entry in `ALL_WATERS` / `ALL_PROVINCES` / `ALL_COUNTRIES`.
- Rond af via de `release` skill.
