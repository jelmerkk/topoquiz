# Refactoring-analyse topoquiz — april 2026

## Inventarisatie: wat is er gebouwd

### Applicatie-architectuur
Single-page app in **index.html** (2.216 regels, 82 KB): CSS (31–715), HTML (716–765), JS (766–2216). Geen bundler, geen framework — pure Leaflet + vanilla JS. **cities.js** (339 regels) bevat alle data-arrays en set-definities. Service worker voor offline PWA.

### Data-arrays (cities.js)

| Array | Items | Velden | Sets |
|-------|-------|--------|------|
| `ALL_CITIES` | 188 | name, lat, lon, pop, sets[], capital?, aliases[] | 54–72 |
| `ALL_PROVINCES` | 16 | name, lat, lon, aliases[], kind?, sets[] | (NL: geen sets), 72 |
| `ALL_WATERS` | 22 | name, lat, lon, aliases[], sets[] | (NL: geen sets), 70, 72 |
| `ALL_COUNTRIES` | 22 | name, lat, lon, sets[] | 70, 71, 72 |

### Quiz-types en hun rendering

Elk quizType heeft een **identiek trio**: een featureData-variabele, een layers-dict, een quizLayer — plus een `buildXLayer()` en `setHighlightX()`:

| quizType | featureData | layers dict | quizLayer | buildFunc | highlightFunc | GeoJSON | nameKey |
|----------|-------------|-------------|-----------|-----------|---------------|---------|---------|
| province | `provinceFeatureData` | `provinceLayers` | `provinceQuizLayer` | `buildProvinceLayer()` | `setHighlightProvince()` | provincie_2023 + gewesten | `statnaam` |
| water | `waterFeatureData` | `waterLayers` | `waterQuizLayer` | `buildWaterLayer()` | `setHighlightWater()` | wateren | `name` |
| country | `countryFeatureData` | `countryLayers` | `countryQuizLayer` | `buildCountryLayer()` | `setHighlightCountry()` | landen-europa | `name` |
| place | — | — | markerLayer | (inline in initLevel) | `setHighlight()` | — | — |

### Styles per type (6 constanten elk)

```
PROV_DEFAULT / PROV_HIGHLIGHT / PROV_MASTERED / PROV_BORDER
WATER_DEFAULT / WATER_HIGHLIGHT / WATER_MASTERED / WATER_HIDDEN
COUNTRY_DEFAULT / COUNTRY_HIGHLIGHT / COUNTRY_MASTERED
NORMAL_STYLE / MASTERED_STYLE (place)
```

Dezelfde kleuren terugkerend: `#c07000` (highlight oranje), `#1b5e20` (mastered donkergroen), `#58CC02` (mastered lichtgroen), `#3b82f6` (default blauw).

### Sets-structuur

15 sets totaal. Enkelvoudig (54–67, 98, 99) of met **phases** (70, 71, 72):

```js
// Enkelvoudig
54: { name, quizType: 'province', fitOnStart, group: 5 }
// Meerfasig
72: { name, group: 7, mastery: 1, bounds, clickCorrectKm, clickCloseKm,
      phases: [
        { id, label, quizType: 'province' },
        { id, label, quizType: 'place' },
        { id, label, quizType: 'water' },
      ] }
```

### Test-structuur

- **test.js** (776 regels) — 296 unit tests: data-integriteit, set-definities, coördinatenchecks. Custom `expect()`/`section()` framework. `npm run test:unit`.
- **12 Playwright specs** — smoke, gameplay, navigation, phases, group-select, country-quiztype, scenarios, regression-baseline, set57, set67, set71, set72. `npm run test:e2e`.

---

## Problemen en refactoring-voorstellen

### 1. HOOG: buildXLayer / setHighlightX is 3× copy-paste

**Probleem**: `buildProvinceLayer()`, `buildWaterLayer()`, `buildCountryLayer()` doen exact hetzelfde met andere variabelen. Idem voor `setHighlightProvince()`, `setHighlightWater()`, `setHighlightCountry()`. Elke nieuw quizType (bijv. `mountain`, `desert`) vereist weer een kopie.

**Voorstel**: Eén generiek `PolygonQuizLayer`-object per quizType:

```js
// Registratie per quizType
const polygonTypes = {
  province: {
    featureData: null,
    layers: {},
    quizLayer: null,
    styles: { default: PROV_DEFAULT, highlight: PROV_HIGHLIGHT, mastered: PROV_MASTERED },
    nameKey: 'statnaam',
    dataPromise: fetch('/provincie_2023.geojson').then(r => r.json()),
  },
  water:   { /* idem */ nameKey: 'name' },
  country: { /* idem */ nameKey: 'name' },
};

function buildPolygonLayer(type) {
  const t = polygonTypes[type];
  if (t.quizLayer) map.removeLayer(t.quizLayer);
  t.layers = {};
  const activeNames = new Set(activeCities.map(c => c.name));
  t.quizLayer = L.geoJSON(t.featureData, {
    style: t.styles.default,
    interactive: false,
    filter: f => activeNames.has(f.properties[t.nameKey]),
    onEachFeature: (f, layer) => { const n = f.properties[t.nameKey]; if (n) t.layers[n] = layer; },
  }).addTo(map);
}

function setHighlightPolygon(type, item) {
  const t = polygonTypes[type];
  Object.entries(t.layers).forEach(([name, layer]) => {
    layer.setStyle(name === item.name
      ? t.styles.highlight
      : (streak[name] >= mastery() ? t.styles.mastered : t.styles.default));
  });
  const layer = t.layers[item.name];
  if (layer) {
    layer.bringToFront();
    if (gameMode !== 'map') map.fitBounds(layer.getBounds(), { padding: [60, 60], maxZoom: 10 });
  }
}
```

**Impact**: ~100 regels verwijderd, nieuwe quizTypes in 5 regels configuratie. Alle bestaande rendering blijft identiek.

**Risico**: Laag — puur interne reorganisatie, geen UI-wijziging.

---

### 2. HOOG: initLevel() layer-cleanup is fragiel

**Probleem** (index.html:1231–1233): Drie hardgecodeerde if-blokken die elke layer handmatig verwijderen. Bij een nieuw quizType vergeet je er snel eentje.

**Voorstel**: Met het `polygonTypes`-register hierboven:

```js
Object.values(polygonTypes).forEach(t => {
  if (t.quizLayer) { map.removeLayer(t.quizLayer); t.quizLayer = null; t.layers = {}; }
});
```

---

### 3. HOOG: Mastered-styling staat op 4 plekken

**Probleem**: `recordCorrect()` (1502–1505), `initStreak()` (1301–1304), en `restoreProgress()` (~2047–2050) bevatten elk een handmatige check op `city.marker` / `provinceLayers[name]` / `waterLayers[name]` / `countryLayers[name]`. Bij elk nieuw quizType moet je alle drie aanpassen.

**Voorstel**:

```js
function applyMasteredStyle(name) {
  // place-marker
  const city = activeCities.find(c => c.name === name);
  if (city?.marker) city.marker.setStyle({ ...MASTERED_STYLE, radius: cityRadius(city) });
  // polygon-types
  Object.values(polygonTypes).forEach(t => {
    if (t.layers[name]) t.layers[name].setStyle(t.styles.mastered);
  });
}
```

---

### 4. MIDDEN: Province name-key mismatch (`statnaam` vs `name`)

**Probleem**: Provincies gebruiken `statnaam` als GeoJSON-property, alle andere types `name`. Dit vereist de `nameKey`-parameter en een apart code-pad.

**Voorstel**: Bij de volgende data-refresh: hernoem `statnaam` → `name` in `provincie_2023.geojson`. Dan is `nameKey` overal `'name'` en kan de hele parameter weg.

**Risico**: Laag, maar vergt een eenmalige GeoJSON-bewerking.

---

### 5. MIDDEN: GeoJSON property-inconsistentie voor sets-filtering

**Probleem**: wateren.geojson features hebben `sets: [72]` om NL/BE te scheiden. landen-europa.geojson features hebben `sets: [71]` maar die wordt niet meer gelezen (filtering gaat via `activeNames`). gewesten.geojson heeft geen `sets`. De filtering-logica verschilt per type:

- **water**: feature.properties.sets + isPhased check (dubbele Maas-oplossing)
- **country**: alleen activeNames (geen feature-level sets)
- **province**: alleen activeNames (geen feature-level sets)

**Voorstel**: Eén universele aanpak:
1. Alle features die set-specifiek zijn krijgen `sets: [n]`
2. Features zonder `sets` = universeel beschikbaar
3. Eén filter in `buildPolygonLayer()`: `activeNames.has(name) && (!f.sets?.length || f.sets.includes(selectedSet))`

Dit maakt de Maas-workaround schoner en voorkomt problemen bij toekomstige dubbele namen (bijv. "Rijn" in NL én Duitsland-set).

---

### 6. MIDDEN: activeCities-vulling verschilt per quizType

**Probleem** (initLevel 1236–1270): Vier if/else-takken met elk andere filterlogica:
- province: `phases ? filter(sets) : ALL_PROVINCES`
- water: `phases ? filter(sets) : filter(!sets)`
- country: `filter(sets.includes)`
- place: `filter(sets.includes)` + daily/bonus speciale gevallen

De `sets`-property ontbreekt bij NL-provincies en NL-wateren (legacy), waardoor er twee paden nodig zijn.

**Voorstel**: Voeg `sets` toe aan alle NL-provincies en NL-wateren:

```js
{ name: 'Groningen', lat: 53.22, lon: 6.57, aliases: [], sets: [54] },
{ name: 'Noordzee',  lat: 52.50, lon: 3.60, sets: [57] },
```

Dan wordt het universeel: `activeCities = SOURCE[quizType].filter(c => c.sets.includes(setNumber))`. Geen if/else meer per type.

**Risico**: Midden — raakt bestaande data. Maar het is puur additief (sets toevoegen, geen bestaande velden verwijderen) en er zijn unit tests die de tellingen borgen.

---

### 7. MIDDEN: Vraagstekst-selectie is verspreid en fragiel

**Probleem** (renderQuestion ~1348–1370): Hardgecodeerde `if (isProvince) ... else if (isWater) ... else if (isCountry)` met teksten als "Welke provincie is dit?", "Welk gewest is dit?" (conditioneel op `kind`), "Welk water is dit?", "Welk land is dit?".

**Voorstel**: Declaratieve mapping:

```js
const QUESTION_TEXT = {
  province: item => item.kind === 'gewest' ? 'Welk gewest is dit?' : 'Welke provincie is dit?',
  water:    () => 'Welk water is dit?',
  country:  () => 'Welk land is dit?',
  place:    city => city.name,
};
document.getElementById('question-text').textContent = QUESTION_TEXT[currentQuizType()](currentCity);
```

---

### 8. LAAG: Kleur-constanten zijn verspreid

**Probleem**: `#c07000` (highlight oranje) verschijnt in PROV_HIGHLIGHT, COUNTRY_HIGHLIGHT, en CSS. `#58CC02` (mastered groen) in 5+ plekken. Bij een redesign moet je overal zoeken.

**Voorstel**: CSS custom properties:

```css
:root {
  --color-highlight: #f0a500;
  --color-highlight-border: #c07000;
  --color-mastered: #58CC02;
  --color-mastered-border: #1b5e20;
  --color-default: #3b82f6;
  --color-default-border: #2a4a8a;
}
```

JS-styles lezen via `getComputedStyle()`, of definieer de kleuren als JS-constanten naast de CSS.

---

### 9. LAAG: Data-processing scripts (data/) schoonmaken

**Probleem**: 14 scripts, deels legacy. `fetch-coastlines.js` en `process-coastlines.js` zijn voor een aanpak die niet meer werkt (zie memory). `fetch-schelde-relations.js` is eenmalig.

**Voorstel**: Verplaats eenmalige scripts naar `data/archive/`. Houd alleen actieve pipeline: `fetch-overpass.js`, `process-overpass.js`, `build-polygons.js`, `process-gewesten.js`.

---

### 10. LAAG: distanceToCountry() en distanceToWater() zijn bijna identiek

**Probleem**: Beide doen "afstand van punt tot polygoon/lijn": pointInPolygon + pointToSegmentDist loop. Maar `distanceToWater()` werkt op `waterFeatureData` met name-lookup, `distanceToCountry()` op `countryFeatureData`.

**Voorstel**: Eén `distanceToFeature(lat, lon, name, featureData)` helper. Is een kleine refactor maar elimineert 20 regels duplicate polygoon-wiskunde.

---

## Voorgestelde volgorde

| Prio | Wat | Impact | Risico | Regels verwijderd |
|------|-----|--------|--------|-------------------|
| 1 | `polygonTypes`-register (#1, #2, #3) | Hoog — schaalbaarheid voor 16 resterende levels | Laag | ~120 |
| 2 | `sets` toevoegen aan NL-data (#6) | Hoog — vereenvoudigt loadLevel | Midden | ~20 |
| 3 | Universele feature-filtering (#5) | Midden — voorkomt dubbele-naam bugs | Laag | ~15 |
| 4 | Vraagstekst-mapping (#7) | Midden — elke nieuwe fase vergt nu een if-blok | Laag | ~10 |
| 5 | `statnaam` → `name` (#4) | Klein maar schoon | Laag | ~5 |
| 6 | Kleuren consolideren (#8) | Klein maar zinvol bij redesign | Laag | 0 |
| 7 | Data scripts opschonen (#9) | Hygiëne | Laag | 0 |
| 8 | Distance-functies mergen (#10) | Klein | Laag | ~20 |

**Totaal**: ~190 regels minder, maar belangrijker: **elk nieuw quizType kost straks 5 regels config in plaats van 40 regels code**.

---

## Wat NIET refactoren

- **Single-file architectuur** — werkt goed voor dit project (offline PWA, geen build-stap, ~2K regels is beheersbaar).
- **Vanilla JS** — geen reden voor React/Vue. De state machine is simpel genoeg.
- **Custom test framework in test.js** — lichtgewicht, snel (0.1s), doet wat het moet.
- **sessionStorage** — prima voor een school-app zonder accounts.
