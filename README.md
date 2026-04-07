# Topografie Quiz

Een topografie-oefentool voor groep 5, gebaseerd op de Geobas-methode. Kinderen leren plaatsen en provincies via meerkeuze of zelf typen, met spaced repetition.

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

### 1. Plaatsen toevoegen aan `cities.js`

Voeg elke nieuwe plaats toe aan `ALL_CITIES`:

```js
{ name: "Plaatsnaam", lat: 52.12, lon: 4.56, pop: 75000, sets: [66] }
```

| Veld | Verplicht | Uitleg |
|------|-----------|--------|
| `name` | ✓ | Officiële naam (wordt getoond en gecontroleerd) |
| `lat` / `lon` | ✓ | WGS84-coördinaten |
| `pop` | ✓ | Bevolking (CBS 2023); bepaalt de stipgrootte (logaritmisch, 4–12px) |
| `sets` | ✓ | Array van set-nummers; een plaats kan in meerdere sets zitten |
| `capital` | | `true` voor provinciehoofdsteden (vierkante marker) |
| `aliases` | | Alternatieve spellingen die als goed worden geaccepteerd |

Als een plaats al bestaat (bijv. Zwolle in set 56), voeg dan alleen het nieuwe setnummer toe aan het bestaande `sets`-array.

### 2. De set registreren in `SETS`

```js
const SETS = {
  // ... bestaande sets ...
  67: { name: '6.7 – Noord-Holland', quizType: 'place', fitOnStart: true },
};
```

| Veld | Uitleg |
|------|--------|
| `name` | Weergavenaam in het menu |
| `quizType` | `'place'` (stippen op kaart) of `'province'` (provincievlakken) |
| `fitOnStart` | `true` = zoom in op de actieve plaatsen; `false` = heel Nederland |
| `mastery` | Optioneel: overschrijft `MASTERY_MC`/`MASTERY_TEXT` voor deze set |
| `bonus` | `true` = elke sessie 20 willekeurige steden uit `ALL_CITIES` |
| `daily` | `true` = 10 datum-geseedde steden, bypast mode-selectiescherm |

**Set-nummering** volgt de Geobas-hoofdstuknummers: 54 → 5.4, 61 → 6.1, enz. Gehele getallen sorteren automatisch in de juiste volgorde in het menu.

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

### Dagelijkse uitdaging (set 98)
Elke dag 10 steden, geseed op de datum — voor iedereen hetzelfde. Altijd meerkeuze, mastery = 1×. Resultaat deelbaar als emoji-grid. Bovenaan het startscherm.

### Bonus level (set 99)
Elke sessie 20 willekeurige steden uit alle sets gecombineerd. Mastery = 1×. Goud omrand op het startscherm.

---

## Quiztypes

### `place` (standaard)
Elke stad krijgt een stip op de kaart. Provinciehoofdsteden (`capital: true`) krijgen een vierkante marker in plaats van een cirkel.

### `province`
Provincievlakken worden gekleurd vanuit het lokale bestand `provincie_2023.geojson` (gebundeld in de repo, bron: cartomap.github.io). De vlakken worden vergeleken op `statnaam`; zorg dat `ALL_PROVINCES[].name` exact overeenkomt. Dit type gebruikt `ALL_PROVINCES` als `activeCities` in plaats van `ALL_CITIES`.

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

## Feedback

Feedback van gebruikers gaat via een ingebouwd formulier naar Google Sheets (Google Forms endpoint). Issues worden bijgehouden op [GitHub](https://github.com/jelmerkk/topoquiz/issues).

---

## Deploy & CI

- `feature/*` branches → ontwikkeling van nieuwe features
- Push naar `staging` triggert GitHub Actions: unit tests + Playwright E2E tests
- Bij groene tests wordt `staging` automatisch gemerged naar `main`
- `main` branch → automatisch gedeployed naar Uberspace via rsync → live op [topoquiz.com](https://www.topoquiz.com)
