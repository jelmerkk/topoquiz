# Topografie Quiz

Een topografie-oefentool voor groep 5–8, gebaseerd op de Geobas-methode. Kinderen leren plaatsen, provincies, landen, wateren en meer via meerkeuze, typen of klikken op de kaart — met spaced repetition.

**Live:** [topoquiz.com](https://www.topoquiz.com) — geen buildstap vereist.

**Lokaal draaien:** `npx serve .` (vereist een lokale server vanwege GeoJSON-fetch).

**Tests:** `npm run test` — draait unit tests (`node test.js`) én Playwright E2E tests. Altijd uitvoeren voor je pusht.

---

## Projectstructuur

| Bestand | Inhoud |
|---------|--------|
| `index.html` | Volledige app: HTML, CSS, JavaScript |
| `cities.js` | Alle plaatsdata, set-definities, provinciedata |

---

## Een nieuw level toevoegen

### 1. Data toevoegen aan `cities.js`

Kies de juiste array op basis van het elementtype:

| Array | Elementtype | Rendering |
|-------|------------|-----------|
| `ALL_CITIES` | Steden, hoofdsteden | Stip op kaart |
| `ALL_PROVINCES` | Nederlandse provincies | Polygoon (`provincie_2023.geojson`) |
| `ALL_WATERS` | Wateren (rivieren, zeeën) | Lijn/polygoon (`wateren.geojson`) |
| `ALL_COUNTRIES` | Landen | Polygoon (`landen-europa.geojson`, `landen-zuidamerika.geojson`, `landen-afrika.geojson`, `landen-noord-midden-amerika.geojson`, `landen-midden-oosten.geojson`, `landen-zuid-azie.geojson`, `landen-oost-azie.geojson`, `landen-zuidoost-azie.geojson`, `landen-oceanie.geojson`, `landen-midden-amerika.geojson`) |
| `ALL_PROVINCES` (eilanden) | Indonesische eilanden | Polygoon (`eilanden-zuidoost-azie.geojson`) — Kalimantan, Sumatra, Sulawesi, Java, Molukken |
| `ALL_PROVINCES` (Antillen) | ABC + Sint Maarten | Polygoon (`eilanden-midden-amerika.geojson`) — echte polygonen voor set 8.9 (Saba + Sint Eustatius als fuzzy ellips) |
| `ALL_PROVINCES` (gebieden) | Tasmanië + Antarctica | Polygoon (`gebieden-oceanie.geojson`) — echte polygonen voor set 8.8 |

Velden per item:
```js
// Stad
{ name: "Plaatsnaam", lat: 52.12, lon: 4.56, pop: 75000, sets: [66] }
// Land of water (set-specifiek)
{ name: "Estland", lat: 58.67, lon: 25.54, sets: [70] }
```

| Veld | Verplicht | Uitleg |
|------|-----------|--------|
| `name` | ✓ | Officiële naam (wordt getoond en gecontroleerd) |
| `lat` / `lon` | ✓ | WGS84-coördinaten (centroid voor label) |
| `pop` | alleen `ALL_CITIES` | Bevolking; bepaalt de stipgrootte (logaritmisch, 4–12px) |
| `sets` | ✓ | Array van set-nummers; een item kan in meerdere sets zitten |
| `capital` | | `true` voor hoofdsteden (vierkante marker) |
| `aliases` | | Alternatieve spellingen die als goed worden geaccepteerd |
| `kind` | | `ALL_PROVINCES`: `'gewest'` / `'eiland'` / `'gebied'` — voor UI-labels in niet-NL-sets (7.2 gewesten, 8.7 eilanden, 8.8/8.9 gebieden) |
| `shape` | | `'fuzzy'` (ellips) of `'peak'` (bergtop-driehoek) — zie *Shape-overrides* onder Wateren |
| `rx`, `ry`, `rot` | bij `shape:'fuzzy'` | Ellips-radii in graden + rotatie (°) |
| `posBySet` | | Per-set positie-override: `{ [setNr]: { lat, lon, rx?, ry?, rot? } }` — zie *Shape-overrides* |

Voor wateren: `sets`-veld aanwezig = set-specifiek (bijv. rivieren in set 7.3); `sets` afwezig = gedeeld (NL wateren, altijd geladen voor set 57).

### 2. De set registreren in `SETS`

**Enkelvoudige set** (één elementtype):
```js
67: { name: '6.7 – Noord-Holland', quizType: 'place', fitOnStart: true, group: 6 },
```

**Meerfasige set** (meerdere elementtypen sequentieel):
```js
73: { name: '7.3 – Frankrijk, Spanje en Portugal', group: 7, mastery: 1,
      bounds: [[35, -12], [52, 10]],
      clickCorrectKm: 80, clickCloseKm: 240,
      phases: [
        { id: 'cities',  label: 'Steden',   quizType: 'place'    },
        { id: 'regions', label: 'Gebieden', quizType: 'province' },
        { id: 'rivers',  label: 'Rivieren', quizType: 'water'    },
      ] },
```

| Veld | Uitleg |
|------|--------|
| `name` | Weergavenaam in het menu |
| `quizType` | `'place'` / `'province'` / `'water'` / `'country'` (enkelvoudige sets) |
| `phases` | Array van fases voor sequentiële multi-type quiz (overschrijft `quizType`) |
| `group` | Groepsnummer (5–8); bepaalt in welke groep het level verschijnt |
| `fitOnStart` | `true` = zoom in op de actieve plaatsen; `false` = heel Nederland |
| `bounds` | `[[lat,lon],[lat,lon]]` — viewport voor EU/wereld-sets |
| `clickCorrectKm` / `clickCloseKm` | Klik-drempels (overschrijven globale standaard 20/60 km) |
| `mastery` | Optioneel: overschrijft `MASTERY_MC`/`MASTERY_TEXT` voor deze set |
| `bonus` | `true` = per-groep willekeurige mixed pool (zie *Dagelijkse uitdaging & bonus* onder) |
| `daily` | `true` = per-groep datum-geseedde mixed pool, bypast mode-selectiescherm |

**Set-nummering** volgt de Geobas-hoofdstuknummers: 54 → 5.4, 61 → 6.1, 70 → test-level, enz.

---

## Game modes

Elke set (behalve provincies) biedt drie oefenmodi:

| Modus | Beschrijving |
|-------|-------------|
| **Meerkeuze** (`mc`) | Een stip op de kaart, naam kiezen uit vier opties |
| **Typen** (`text`) | Een stip op de kaart, naam zelf intypen (fuzzy matching) |
| **Klik op de kaart** (`map`) | Stadsnaam zichtbaar, klik op de kaart waar de stad ligt |

### Klik-op-de-kaart drempelwaarden
| Afstand | Resultaat |
|---------|-----------|
| < 20 km | ✅ Correct |
| 20–60 km | ⚠️ Bijna (telt als fout) |
| > 60 km | ❌ Fout |

---

## Speciale sets

### Dagelijkse uitdaging & bonus (set 98 / 99) — per groep, mixed-type

Zowel de daily (set 98) als de bonus (set 99) zijn **per-groep** en bevatten een
**mix van item-types** (steden, provincies/regio's, wateren, landen, gebergten) —
afgestemd op wat een kind in die groep heeft geleerd. Altijd meerkeuze,
mastery = 1×, knoppen onderaan de set-lijst na groepkeuze.

De mix per groep wordt gedreven door twee tabellen in `cities.js`:

```js
const DAILY_FORMAT = {
  5: [ {type:'region', count:3}, {type:'place', count:5}, {type:'water', count:2} ],
  6: [ {type:'place',  count:10} ],
  7: [ {type:'country', count:2}, {type:'place', count:4}, {type:'region', count:3}, {type:'water', count:1} ],
  8: [ {type:'country', count:3}, {type:'place', count:4}, {type:'region', count:2}, {type:'water', count:1} ],
};
const BONUS_FORMAT = {
  5: [...],  // 20 items: 6 regio + 10 steden + 4 wateren
  6: [ {type:'place', count:25} ],
  7: [...],  // 35 items: 7 landen + 14 steden + 7 regio + 4 gebergten + 3 wateren
  8: [...],  // 40 items: 12 landen + 16 steden + 8 gebergten + 4 wateren
};
```

- **Types** (`_itemType`): `'place'` (uit `ALL_CITIES`), `'country'` (`ALL_COUNTRIES`),
  `'water'` (`ALL_WATERS`), `'region'` (alle kinds uit `ALL_PROVINCES` — provincie,
  gewest, regio, gebied, eiland, berg).
- **Per-groep filter**: elk item komt uit `ALL_<X>` gefilterd op
  `item.sets.some(s => SETS[s].group === selectedGroup)`.
- **Daily seed**: `dateSeed(dateStr, group) = (dateNum * 31 + group) | 0` — zelfde
  datum + andere groep geeft een andere pool.
- **Bonus** wordt bij de eerste klik opgebouwd en in `sessionStorage` bewaard
  (`{name, _itemType}[]`) zodat terugnavigeren dezelfde pool herstelt.
- **Distractors** in meerkeuze worden per vraag gefilterd op hetzelfde
  `_itemType` (en voor `region` ook op `kind`) — geen stad als distractor bij
  een regio-vraag.
- **Dedupe**: `buildMixedPool` houdt een `usedNames`-set bij zodat namen die in
  meerdere pools voorkomen (Panama stad + land, Luxemburg stad + land) niet
  dubbel in één sessie landen — dat voorkomt collisions in de
  streak/answer-tracking.
- **Composite answer-key**: `dailyAnswerKey(city) = "${_itemType}:${name}"` zodat
  cross-type naam-duplicaten los worden bijgehouden in de daily-emoji-grid.
- **Map-framing**: `startQuiz` slaat voor daily/bonus de rAF-bounds-fallback
  over; `renderQuestion` bepaalt per item het kader (polygon → `fitBounds`
  op de laag; `place` → `flyTo` op de stad met zoom 8). Zonder deze skip
  racete de NL_BOUNDS-fallback met de Armenia-fitBounds en klapte de kaart
  terug naar Nederland.

Toegankelijkheid: de daily- en bonus-knop zijn alleen zichtbaar nadat de
leerling op het startscherm een groep heeft gekozen. Daarvoor hangen ze
verborgen onder `sessionStorage.selectedGroup`.

---

## Quiztypes

### `place` (standaard)
Elke stad krijgt een stip op de kaart. Provinciehoofdsteden (`capital: true`) krijgen een vierkante marker in plaats van een cirkel.

### `province`
Provincievlakken worden gekleurd vanuit het lokale bestand `provincie_2023.geojson` (gebundeld in de repo, bron: cartomap.github.io). De vlakken worden vergeleken op `statnaam`; zorg dat `ALL_PROVINCES[].name` exact overeenkomt. Dit type gebruikt `ALL_PROVINCES` als `activeCities` in plaats van `ALL_CITIES`.

### `country`
Landspolygonen worden gekleurd vanuit de `landen-*.geojson` bestanden (vereenvoudigd Natural Earth-formaat, per werelddeel apart). Bestanden worden bij het opstarten samengevoegd tot één `FeatureCollection`. Elk feature heeft een `name`-property die overeenkomt met `ALL_COUNTRIES[].name`. Meerkeuze- en typemodus werken identiek aan `province`; klik-op-de-kaart gebruikt `distanceToCountry()` (0 km als klik binnen het polygoon valt).

### `water`
Waterlijnen en -polygonen vanuit `wateren.geojson`. Ondersteunt `LineString` (rivieren, kanalen) en `Polygon` (zeeën, meren). Set-specifieke wateren hebben een `sets`-veld; wateren zonder `sets` worden alleen in set 57 geladen.

## Meerfasige sets (`phases`)

Sets met een `phases`-array doorlopen de fases sequentieel: eerst alle items van fase 1 memoriseren, dan een tussenscherm, dan fase 2, enzovoort. Binnen elke fase is het quizType homogeen (geen menging van stippen en polygonen). De voortgangsbalk toont het fasesabel en itemteller per fase.

---

## Spaced repetition

- **Meerkeuze / klik op kaart:** een plaats is geleerd na 3× correct (`MASTERY_MC = 3`)
- **Typen:** na 1× correct (`MASTERY_TEXT = 1`)
- **Speciale sets (daily/bonus):** na 1× correct (instelbaar via `mastery`-veld in SETS)
- Elke fout reset de streak naar 0
- Plaatsen dichterbij de huidige vraag worden vaker als afleider gekozen (`nearbyDistractors`)

---

## Fuzzy matching (typmodus)

Antwoorden worden genormaliseerd (lowercase, spaties/koppeltekens verwijderd) en vergeleken via Levenshtein-afstand:

| Naamlengte | Max. typefouten |
|------------|----------------|
| ≤ 4 tekens | 0 |
| 5–8 tekens | 1 |
| ≥ 9 tekens | 2 |

Bij een typefouten-match krijgt de leerling de melding "Bijna!" maar telt het wel als goed.

---

## Navigatie & voortgang

De app gebruikt de History API (`pushState`/`popstate`) zodat de browserterugknop werkt. Voortgang per level+modus wordt opgeslagen in `sessionStorage` en automatisch hersteld bij terugnavigeren. Voortgang wordt gewist zodra een quiz volledig is afgerond.

---

## Wateren (set 5.7)

### wateren.geojson

Alle waterlichamen staan in `wateren.geojson` als GeoJSON `FeatureCollection`. Elk feature heeft een `name` property die overeenkomt met de namen in `cities.js` (set 57).

| Type | Waterlichamen |
|------|--------------|
| `LineString` | Rijn, Waal, Neder-Rijn, Lek, IJssel, Maas, Bergse Maas, Oude Maas, Nieuwe Waterweg, Noordzeekanaal, Amsterdam-Rijnkanaal |
| `Polygon` | Noordzee, Waddenzee, Oosterschelde, Westerschelde, Eems |
| `fuzzy` (ellips) | Alle nieuwe zeeën en oceanen (Middellandse Zee, Oostzee, Atlantische Oceaan, Grote Oceaan, Indische Oceaan, Caribische Zee, …) |

### Zeeën/oceanen: gebruik fuzzy, niet hard polygoon

Een harde zee-polygoon met echte kustlijn vergt per kust OSM-ways chainen, RDP, inlet-overbruggingen en visuele verificatie — de Noordzee (#37, #38) kostte meerdere iteraties en blijft dichtbij land imperfect. Voor alle **nieuwe** zeeën/oceanen gebruiken we daarom een `shape: 'fuzzy'` ellips, zo geplaatst en gemaatvoerd dat de ellips **niet tegen land aanligt** (ruime marge t.o.v. de kust). De Noordzee/Waddenzee/etc. blijven hard polygoon (al gedaan), maar we investeren daar niet meer in tenzij er een concrete blokkerende fout is. De Atlantische Oceaan was eerder een polygoon maar is in v2.16.0 omgezet naar fuzzy om per-set plaatsing mogelijk te maken (zie `posBySet` hieronder).

### Shape-overrides: `fuzzy`, `peak`, en `posBySet`

Items in `ALL_WATERS` en `ALL_PROVINCES` kunnen een afwijkende visuele vorm krijgen via het `shape`-veld. `ensureShapeFeatures()` in `index.html` vervangt of injecteert de feature op rendertijd:

| `shape` | Rendering | Extra velden | Gebruikt voor |
|---------|-----------|--------------|---------------|
| (geen) | Polygon/LineString uit de GeoJSON | — | Standaard (NL-provincies, landen, rivieren, hard polygoon-zeeën) |
| `'fuzzy'` | Doorzichtige ellips | `rx`, `ry` (graden), optioneel `rot` | Zeeën/oceanen, gebieden zonder scherpe grens (Himalaya, Sahara), te kleine eilanden (Saba, Sint Eustatius) |
| `'peak'` | Gekleurde driehoek (bergtop) | — | Mount Everest (set 8.5) en toekomstige bergtoppen |

**`posBySet`-override** — één entry, per-set plaatsing:

Voor items die in meerdere sets zitten maar per set een ander kijkvlak hebben (typisch oceanen). De base `lat/lon/rx/ry/rot` geldt als default; `posBySet[setNr]` overrulet die waarden alleen voor die ene set. `buildEllipseFeature(entry, activeSet)` leest de override op rendertijd.

```js
{ name: 'Grote Oceaan', lat: 30, lon: 160, shape: 'fuzzy', rx: 30, ry: 25,
  sets: [86, 87, 88, 89],
  posBySet: {
    88: { lat:  -5, lon: 180, rx: 17, ry: 22 },   // Oceanië-perspectief
    89: { lat:  10, lon: -92, rx:  3, ry:  5 },   // Midden-Amerika-perspectief
  },
}
```

Gebruikt voor Atlantische Oceaan, Grote Oceaan en Indische Oceaan (set 78/88/89 gedeeld).

### Klik-op-de-kaart modus (wateren)

De water-quiz ondersteunt ook `map`-modus. De leerling klikt op de kaart waar het water ligt; de afstand wordt berekend via `distanceToWater()`:

- **LineString**: kortste afstand tot een lijnstuk (punt-naar-segment)
- **Polygon**: 0 km als het punt binnen het polygoon ligt; anders kortste afstand tot de rand

Drempelwaarden gelden dezelfde als steden (< 20 km correct, 20–60 km bijna, > 60 km fout). Tijdens de vraag zijn alle waterlichamen verborgen totdat ze correct geraden zijn.

### OSM-datapipeline

Riviercoördinaten komen uit OpenStreetMap via de Overpass API. De pipeline:

```
data/fetch-overpass.js       → haalt ruwe OSM way-geometrie op (rate-limit-aware)
data/fetch-overpass-retry.js → herhaalpogingen voor mislukte rivieren
data/fetch-rhein-south.js    → specifiek: Rijn Köln→Wesel (Rhein)
data/process-overpass.js     → chain + RDP-vereenvoudiging → processed.json
```

**Stap 1 – Fetch:**
```bash
node data/fetch-overpass.js        # slaat op in data/overpass/*.json
node data/fetch-rhein-south.js     # Rhein-sectie (indien nodig)
```

**Stap 2 – Process:**
```bash
node data/process-overpass.js      # output: data/overpass/processed.json
```

Instellingen per rivier in `process-overpass.js`:
| Instelling | Uitleg |
|-----------|--------|
| `file` | Ruwe Overpass JSON in `data/overpass/` |
| `eps` | RDP-epsilon in graden (0.001 = detail, 0.003 = grof) |

**Stap 3 – Handmatig bijwerken:**
Kopieer de gewenste coördinaten uit `processed.json` naar `wateren.geojson`. Gebruik `debug-wateren.html` + Playwright voor visuele controle (zie *Debug workflow* hieronder).

### Een rivier verbeteren of toevoegen

1. Zoek de OSM-naam op (bijv. `"Rhein"` in Duitsland, `"Rijn"` in Nederland)
2. Schrijf een Overpass-query in `fetch-overpass.js`:
   ```js
   { name: 'nieuwe-rivier', q: 'way["name"="Naam"]["waterway"="river"](lat1,lon1,lat2,lon2);out geom;' }
   ```
3. Voer fetch + process uit
4. Pas `wateren.geojson` aan en controleer visueel
5. Voeg de rivier toe aan `cities.js` set 57 met `lat`/`lon` voor het label

**Chaining:** het process-script schakelt losse OSM-ways aaneen via een bidirectioneel greedy-algoritme (gap-drempel 0.05°). Bij een gap > 0.05° stopt de keten — voeg dan handmatig een brugpunt toe.

### Debug workflow

```bash
python3 -m http.server 8080   # serveer vanuit project-root
# open http://localhost:8080/debug-wateren.html
```

Of via Playwright (headless screenshot):
```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setViewportSize({ width: 1200, height: 700 });
  await p.goto('http://localhost:8080/debug-wateren.html', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  await p.evaluate(() => map.setView([52.3, 5.3], 7));
  await p.waitForTimeout(800);
  await p.screenshot({ path: 'debug/debug-wateren-overzicht.png' });
  await b.close();
})();
"
```

---

## Dev tips

### Deep-link naar set / modus / fase

Voor snel handmatig testen kun je via URL-parameters direct de quiz in springen, zonder door het startscherm en mode-select te klikken:

| URL | Effect |
|---|---|
| `?set=73` | Springt naar mode-select van set 7.3 |
| `?set=73&mode=mc` | Start quiz set 7.3 in meerkeuze-modus, fase 0 |
| `?set=73&mode=map&phase=2` | Start quiz in klik-op-kaart-modus, fase 2 (derde fase) |

Modi: `mc` (meerkeuze), `text` (typen), `map` (klik op kaart). Ongeldige of ontbrekende parameters vallen stil terug op het gewone startscherm. Werkt op elke build (dev, preview én productie), maar bedoeld voor dev-testen.

---

## Feedback

Feedback van gebruikers gaat via een ingebouwd formulier naar Google Sheets (Google Forms endpoint). Issues worden bijgehouden op [GitHub](https://github.com/jelmerkk/topoquiz/issues).

---

## Deploy & CI

- `feature/*` branches → ontwikkeling van nieuwe features
- Push naar `staging` triggert GitHub Actions: unit tests + Playwright E2E tests
- Bij groene tests wordt `staging` automatisch gemerged naar `main`
- `main` branch → automatisch gedeployed naar Uberspace via rsync → live op [topoquiz.com](https://www.topoquiz.com)
