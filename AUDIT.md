# Code-audit topoquiz — scope 1 van #86

Datum: 2026-04-21. Repo op versie **v2.18.4** (`APP_VERSION` in `index.html:2220`; ook in `<meta name="version">` op `index.html:8`).

Dit rapport inventariseert de codekwaliteit-schuld die in scope 1 van issue
**#86** is genoemd. Per onderwerp: observaties met `file:regel`, geschatte
LOC-impact bij refactor, en voorgestelde volgorde.

**Nog niet refactoren.** Dit is een planningsdocument; de gebruiker kiest
welke hoofdstukken tot een sprint leiden. Het rapport is zo geschreven dat
een nieuwe LLM-sessie er cold mee kan werken — elke observatie staat los
van de context waarin hij is geschreven.

Bronbestanden waarop gerefereerd wordt:

| Bestand | Regels | Rol |
|---|---|---|
| `index.html` | 2688 | Monoliet: HTML + CSS + JS |
| `cities.js`  | 1170 | Data-arrays + `SETS` + `DAILY_FORMAT`/`BONUS_FORMAT` |
| `test.js`    | 2382 | Unit-tests (custom harness) |
| `tests/*.spec.js` | — | Playwright E2E |

De cijfers zijn gevalideerd via `wc -l`; per-sectie-LOC is geteld op exacte
`^/\* ── | ── \*/`-markers in `index.html`.

---

## 1. `index.html`-monoliet

### 1.1 Top-level structuur

| Regels | LOC | Blok |
|---|---|---|
| 1–30 | 30 | `<head>`-meta, SEO, PWA-manifest, Leaflet-CSS |
| 31–604 | 574 | `<style>` — één CSS-blok |
| 606–619 | 14 | Matomo-snippet |
| 620–739 | 120 | `<body>`-markup (7 schermen + feedback-modal) |
| 740–741 | 2 | Leaflet + `cities.js` loader |
| 742–2673 | 1932 | Hoofd-JS (`<script>`) — 79 top-level functies |
| 2674–2678 | 5 | Footer-markup |
| 2679–2686 | 8 | Kleine post-script (version-tag injectie) |
| 2687–2688 | 2 | `</body></html>` |
| **Totaal** | **2688** | |

Het `<script>`-blok 742–2673 is zelf al 72 % van het bestand en draagt al de
risico-complexiteit: globale state, side-effects, Leaflet-DOM-coupling, en
alle UI-transitions vermengd.

### 1.2 CSS-sectie (regels 31–604, 574 LOC) — onderverdeling

Elke `/* ── … ── */`-comment markeert een logische sub-sectie:

| Regels | LOC | Sub-sectie | Splitsbaar naar |
|---|---|---|---|
| 31–46 | 16 | reset + body/h1/title-bar | `app.css` (base) |
| 47–78 | 32 | Start screen | `screens/start.css` |
| 79–207 | 129 | Kaart-klik modus + group-select (bevat `.mode-btn`, `.daily-btn`, `.group-btn`) | `screens/start.css` |
| 208–236 | 29 | Score bar | `screens/quiz.css` |
| 237–250 | 14 | Map (`#map-wrap`, `#leaflet-map`) | `map.css` |
| 251–282 | 32 | Hoofdstad-markering + pulse-marker (Leaflet `divIcon` styling) | `map.css` |
| 283–370 | 88 | Question-box + MC-opties + text-input + feedback | `screens/quiz.css` |
| 371–391 | 21 | Hard-panel | `screens/quiz.css` |
| 392–435 | 44 | End-screen | `screens/end.css` |
| 436–545 | 110 | Feedback-modal | `screens/feedback.css` |
| 546–554 | 9 | End-screen sterren | `screens/end.css` |
| 555–563 | 9 | Streak-teller | `screens/quiz.css` |
| 564–583 | 20 | `@keyframes` (animaties) | `animations.css` |
| 584–603 | 20 | Responsive `@media` | verdelen per sectie of apart |

**Observatie** — er is geen globale-klassen-strijd (alle selectors zijn
`#id`-gebaseerd of scherm-geprefixet), dus extractie naar losse CSS-files is
mechanisch veilig. Geen CSS-variabelen nodig om te splitsen.

### 1.3 JS-sectie (regels 742–2673) — onderverdeling

Nauwkeurig gelabeld door de `// ── … ──`-comments. Dit is de natuurlijke
module-grens-set die een nieuwe refactor 1-op-1 zou kunnen hanteren:

| Regels | LOC | Sectie (bron-comment) | Concept | Kandidaat-module |
|---|---|---|---|---|
| 743–774 | 32 | map-initialisatie (Leaflet + tile-config) | map-kern | `src/map/core.js` |
| 775–815 | 41 | Gedeelde kleurtokens (PROV/WATER/COUNTRY/FUZZY/PEAK styles) | styles | `src/map/styles.js` |
| 816–878 | 63 | `polygonTypes`-register (province/water/country) | polygon-state | `src/map/polygonTypes.js` |
| 879–911 | 33 | Water-fetch + `smoothLine`/`smoothGeoJSON` (Catmull-Rom) | geometry-util | `src/map/smooth.js` |
| 912–997 | 86 | Generieke polygon-laagfuncties (`buildEllipseFeature`, `buildPeakFeature`, `ensureShapeFeatures`, `styleForFeature`) | geometry-util | `src/map/shapes.js` |
| 999–1075 | 77 | `buildPolygonLayer`, `setHighlightPolygon`, `applyMasteredStyle`, `clearPolygonLayers` | polygon-ops | `src/map/polygonLayer.js` |
| 1077–1140 | 64 | Provincie/landen-dataloading-pipelines (Promise.all-ketens) | bootstrap | `src/data/loaders.js` |
| 1141–1167 | 27 | Marker-stijlen + `pulseIcon` + `setHighlight` | markers | `src/map/markers.js` |
| 1169–1176 | 8 | Game-state constanten (MASTERY_MC/TEXT) + `mastery()` | game-rules | `src/game/rules.js` |
| 1177–1266 | 90 | Kaart-klik logica (`haversine`, `pointToSegmentDist`, `pointInPolygon`, `distanceToFeature`, `clickResult`) | pure-logica | `src/game/clickScoring.js` |
| 1267–1358 | 92 | Daily-challenge logica (`makeRng`, `dateSeed`, `seededShuffle`, pool-helpers, `dailyPool`, `buildBonusPool`, emoji, keys) | pure-logica | `src/game/dailyBonus.js` |
| 1360–1380 | 21 | Game-state globals + `currentQuizType()` | state | `src/game/state.js` |
| 1382–1430 | 49 | Text-answer helpers (`normalize`, `levenshtein`, `typoThreshold`, `matchInput`) | pure-logica | `src/game/text.js` |
| 1431–1449 | 19 | Hint (`maxHintChars`, `showHint`) | UI-helpers | `src/ui/hint.js` |
| 1450–1559 | 110 | `initLevel()` — bouwt pool + markers voor een set (120 inclusief kop) | state + DOM | `src/game/initLevel.js` |
| 1561–1572 | 12 | `initStreak()` | state | `src/game/state.js` |
| 1573–1647 | 75 | `buildPool`, `shuffle`, `pickCity`, `dist`, `distractorPool`, `nearbyDistractors` | pure-logica | `src/game/questionSelection.js` |
| 1648–1718 | 71 | `renderQuestion()` | UI | `src/ui/question.js` |
| 1719–1742 | 24 | `checkMcAnswer()` | gameplay | `src/game/answer.js` |
| 1743–1774 | 32 | `checkTextAnswer()` | gameplay | `src/game/answer.js` |
| 1776–1844 | 69 | Gedeelde result-helpers (`spawnConfetti`, `recordCorrect`, `recordWrong`) | gameplay | `src/game/answer.js` |
| 1846–1906 | 61 | `handleMapClick()` | gameplay | `src/game/answer.js` |
| 1908–1947 | 40 | `updateScoreboard`, `showPhaseTransition` | UI | `src/ui/scoreboard.js` |
| 1949–1985 | 37 | `finishAnswer`, `updateHardList` | gameplay | `src/game/answer.js` |
| 1989–2069 | 81 | `showEnd`, `rateQuiz`, `shareDailyResult` | UI | `src/ui/endScreen.js` |
| 2071–2083 | 13 | State (`selectedSet`, `quizStartTime`, `consecutiveCorrect`) + `_trackQuiz` | state + analytics | `src/game/state.js` |
| 2084–2202 | 119 | `_renderLevelSelect`, `_renderModeSelect` | UI | `src/ui/startScreen.js` |
| 2204–2217 | 14 | `selectLevel` (history-routing in UI-laag) | router | `src/ui/router.js` |
| 2219–2282 | 64 | Quiz-menu + feedback-modal handlers | UI | `src/ui/feedback.js` |
| 2284–2309 | 26 | `_renderStartScreen`, `showStartScreen` | UI | `src/ui/startScreen.js` |
| 2311–2423 | 113 | `startQuiz()` (async — dataload-wacht, init, fitBounds, UI-reset) | orchestrator | `src/game/startQuiz.js` |
| 2425–2467 | 43 | `saveProgress`, `restoreProgress`, `clearSavedProgress`, `resetQuiz` | persistence | `src/game/progress.js` |
| 2469–2481 | 13 | `popstate`-handler (browser-back) | router | `src/ui/router.js` |
| 2483–2531 | 49 | PWA: install-prompt + `hardRefresh` | PWA | `src/pwa/install.js` |
| 2533–2561 | 29 | `history.replaceState` + `_maybeDeepLink` + bootstrap | router | `src/ui/router.js` |
| 2563–2672 | 110 | Dev-menu (IIFE) | dev-tooling | `src/dev/panel.js` |

### 1.4 Observaties over de splitsing

- **De CSS is mechanisch splitsbaar** — geen globale cascade-afhankelijkheden
  tussen `/* ── … ── */`-blokken. Een simpele `<link>`-per-sectie levert
  hetzelfde resultaat; kleurwaarden (`#c07000`, `#58CC02` etc.) worden
  hergebruikt maar niet als CSS-variabele — de inlining is acceptabel
  zolang `styles` in JS (zie `index.html:776-813`) de waarheidsbron blijft.
- **Pure logica vs DOM-coupling is helder te scheiden**. De volgende blokken
  zijn aantoonbaar DOM-vrij en direct naar `src/game/*.js` te verplaatsen,
  100 % dekkend door `test.js`:
  - `smoothLine`/`smoothGeoJSON` (`index.html:887-910`)
  - `buildEllipseFeature`/`buildPeakFeature` (`index.html:917-966`)
  - `haversine`/`pointToSegmentDist`/`pointInPolygon`/`distanceToFeature`/`clickResult` (`index.html:1181-1265`)
  - `makeRng`/`dateSeed`/`seededShuffle`/`poolForType`/`polygonTypeFor`/`buildMixedPool`/`dailyPool`/`buildBonusPool` (`index.html:1268-1346`)
  - `normalize`/`levenshtein`/`typoThreshold`/`matchInput` (`index.html:1385-1429`)
  Samen ~280 LOC, direct verhuisbaar.
- **De orchestrators (`startQuiz`, `initLevel`, `renderQuestion`,
  `handleMapClick`, `finishAnswer`, `showEnd`) blijven noodzakelijkerwijs
  impure** — zij coördineren tussen Leaflet, DOM en state. Hier is de
  opbrengst van splitsen kleiner: vooral leesbaarheid, geen testbaarheid.
- **Globale state** is wijd verspreid: `selectedSet`, `gameMode`,
  `activeCities`, `streak`, `sessionOk`, `sessionErr`, `cumulativeOk`,
  `cumulativeErr`, `currentCity`, `answered`, `hintRevealed`,
  `currentPhaseIndex`, `dailyAnswers`, `mapClickMarker`, `highlightMarker`,
  `selectedSet`, `quizStartTime`, `consecutiveCorrect`. Bij modulair
  splitsen moet ofwel een centrale `state`-module worden opgezet, ofwel
  moeten deze via parameters doorgegeven worden. Dit is de hoofdreden
  waarom de monoliet niet in één sprint te splitsen is.

### 1.5 Voorgestelde volgorde van splitsing

1. **CSS-extractie** (sprint 1 kwart): 574 regels → 5–7 losse `.css`-files
   (één per screen). Zero-risk — testen blijven groen zolang bestandsvolgorde
   klopt. Winst: 20 % bestandsgrootte minder in `index.html`, duidelijke
   ownership per scherm.
2. **Pure-logica-modules** (sprint 1 half): ~280 LOC verhuizen naar `src/game/*.js`
   met `import`/`export`. Vereist omschakelen naar een build (vite/esbuild)
   óf een pragmatisch `<script type="module">` zonder bundler. `test.js` kan
   direct meelezen — is al Node-compatibel (`module.exports`-check in
   `cities.js:1169`).
3. **UI-modules** (sprint 2 helft): scherm-renderers en hun handlers naar
   `src/ui/*.js`. State blijft voorlopig in één `state.js`-object; later
   eventueel event-emitter.
4. **Orchestrator-laag laatst** — `startQuiz`/`initLevel` vereisen een
   bewuste herontwerp (zie hoofdstuk 7 over router).

### 1.6 LOC-impact schatting

- Pure extractie zonder herstructureren: `index.html` krimpt van 2688 naar
  circa **900 regels** (alleen `<head>`, `<body>`-markup, en een thin
  `main.js` die modules importeert).
- De verplaatste code is zelf niet korter — het wordt alleen per-file
  opgesplitst. Géén LOC-besparing op de lijn, wel drastisch kleinere
  mentale load per bestand (gem. 60–110 LOC per module).

---

## 2. `polygonTypes`-register (`index.html:820-877`, 58 LOC)

### 2.1 Huidige vorm

Drie entries — `province`, `water`, `country` — met identieke velden:
`featureData`, `layers`, `quizLayer`, `styles`, `nameKey`, `afterHighlight`.
`dataPromise` wordt later buiten het object gezet (`index.html:880, 1084,
1122`). De drie `afterHighlight`-closures zijn de enige echte polymorfe
plek:

```
province.afterHighlight  (index.html:831-844, 14 regels)
  - layer = this.layers[item.name]
  - als item.shape !== 'fuzzy' && !== 'peak': fitBounds(padding:[60,60], maxZoom:6)
  - anders: panTo als buiten view

water.afterHighlight     (index.html:855-861,  7 regels)
  - layer = this.layers[item.name]
  - altijd fitBounds(padding:[60,60], maxZoom:10)

country.afterHighlight   (index.html:869-875,  7 regels)
  - layer = this.layers[item.name]
  - fitBounds(padding:[80,80], maxZoom:5) ALS gameMode !== 'map'
```

### 2.2 Waar ze echt verschillen

| Verschil | province | water | country |
|---|---|---|---|
| `maxZoom` | 6 | 10 | 5 |
| `padding` | `[60,60]` | `[60,60]` | `[80,80]` |
| `fitBounds` overslaan | shape in `{fuzzy,peak}` → panTo | nooit | `gameMode==='map'` |
| `animate` | `true` expliciet | default | `true` expliciet |

### 2.3 Of het generieker kan

**Ja — eenvoudig.** De drie closures zijn verschillen in data, niet in
logica. Eén generieke implementatie met een `highlightZoom`-veld (plus een
optionele predicate voor het overslaan van fitBounds) vangt alles af:

```js
// Voorgestelde vorm
{
  province: { …, highlightZoom: 6, highlightPadding: [60,60],
              skipFit: item => item.shape === 'fuzzy' || item.shape === 'peak' },
  water:    { …, highlightZoom: 10, highlightPadding: [60,60] },
  country:  { …, highlightZoom: 5,  highlightPadding: [80,80],
              skipFit: () => gameMode === 'map' },
}
```

En `setHighlightPolygon` (zie hoofdstuk 6) doet vóór het aanroepen van
`t.afterHighlight` of er überhaupt een `layer` is, dus de `if (layer)`-guard
kan uit het register.

**Trade-off.** Het voordeel is kleiner dan bij `buildPolygonLayer` (geen 3×
dedup — het zijn al unieke closures). Winst: ~20 LOC, ≈6 per type. Het
laat vooral toe om een **vierde type** (bijv. `archipelago` voor eilanden
die nu als `province` worden misbruikt, zie set 87/89) toe te voegen door
alleen de 4 velden te specificeren.

### 2.4 Voorgestelde volgorde

Doen ná hoofdstuk 3 (`buildPolygonLayer`-dedup), want daar zit de grote
winst, en die refactor raakt deels hetzelfde codepad. Alleen register
generiek maken zonder de mixed-tak opruimen is laag-prioriteit.

---

## 3. `buildPolygonLayer` — `_isMixed` vs. normale tak (`index.html:999-1043`, 45 LOC)

### 3.1 Exacte code beide takken

Na de setup (1000–1010) is alleen de `filter`-callback verschillend:

**Normale tak (`index.html:1029-1033`, 5 regels kern)**:

```js
// Feature-level sets: oplossing voor dubbele namen (bijv. Maas NL vs Maas BE)
if (fSets?.length) return fSets.includes(selectedSet);
// Geen feature-sets: toon alleen als de data-array ook geen set-specificatie heeft
return !SETS[selectedSet].phases;
```

**Mixed (daily/bonus) tak (`index.html:1021-1028`, 8 regels kern)**:

```js
// activeCities is heterogeen — match feature-sets tegen item-eigen sets
const item = activeCities.find(c => c.name === name && polygonTypeFor(c._itemType) === type);
if (!item) return false;
if (fSets?.length && item.sets?.length) return fSets.some(s => item.sets.includes(s));
return true;
```

### 3.2 Wat ze delen

Beide takken krijgen na `activeNames.has(name)`-guard (`index.html:1018`)
een feature binnen. Beide moeten uiteindelijk beslissen: "komt dit
feature-exemplaar overeen met het gewenste item?" Het *begrip* is identiek
— het verschilt alleen in de key waartegen `feature.properties.sets`
gematcht wordt (set-nummer vs. meerdere item-sets).

### 3.3 Dedup-schatting

Een uniforme `filter` ziet er zo uit:

```js
// Vind het item in activeCities dat deze feature representeert
const item = activeNames.has(name)
  ? activeCities.find(c => c.name === name
       && (!c._itemType || polygonTypeFor(c._itemType) === type))
  : null;
if (!item) return false;

// Match feature.sets tegen item.sets (voor mixed) óf tegen selectedSet (normaal)
if (fSets?.length) {
  if (item.sets?.length) return fSets.some(s => item.sets.includes(s));
  return fSets.includes(selectedSet);
}
// Geen feature-sets — alleen tonen voor niet-gefaseerde sets
return !SETS[selectedSet].phases;
```

Dat is **één pad, 9 regels, 0 branches op `_isMixed`**. De huidige code
weegt 23 regels filter-body (1016–1034). **Besparing ≈ 12-14 LOC** plus
het wegvallen van de `_setDef`/`_isMixed` setup (1011–1012).

Aandachtspunt: in de huidige mixed-tak returnt de final branch `return
true` (als er geen `fSets` is). Dat wijkt af van de normale tak die
`return !SETS[selectedSet].phases` doet. Bij mixed is `selectedSet` sets
98/99 — `SETS[98].phases` is `undefined`, dus `!undefined === true`: gedrag
is hetzelfde. Verificatie in test aanbevolen vóór merge (unit tests in
`test.js` hebben al dekking op daily-pool shape).

### 3.4 Voorgestelde volgorde

**Eerste refactor van scope 1.** Laag risico (één functie), duidelijke
testbaarheid, en zet het register (hoofdstuk 2) in de juiste vorm voor
uitbreiding.

---

## 4. `cities.js`-`SETS`: veld-overzicht + voorstel discriminated union

### 4.1 Huidige vorm

`SETS` is één flat object waarvan de vorm per entry drastisch verschilt
(`cities.js:901-1140`, 240 regels). Velden die ergens voorkomen:
`name`, `quizType`, `fitOnStart`, `group`, `mastery`, `bounds`,
`clickCorrectKm`, `clickCloseKm`, `phases`, `daily`, `bonus`, `beta`.

### 4.2 Veld × set-matrix

`x` = veld gezet; `–` = afwezig. Volgorde: groep 5/6 → groep 7/8 → daily/bonus.

| Set | quizType | fitOnStart | group | mastery | bounds | clickCorrectKm | clickCloseKm | phases | daily | bonus |
|-----|----------|------------|-------|---------|--------|----------------|--------------|--------|-------|-------|
| 54 5.4 Provincies      | province | false | 5 | – | – | – | – | – | – | – |
| 55 5.5 Provinciehoofdsteden | place | false | 5 | – | – | – | – | – | – | – |
| 56 5.6 Grote steden    | place    | false | 5 | – | – | – | – | – | – | – |
| 57 5.7 Wateren         | water    | false | 5 | – | – | – | – | – | – | – |
| 58 5.8 Onze buren      | – (*phases*) | – | 5 | 1 | x | 100 | 300 | x | – | – |
| 61–67 Groep-6 (7 sets) | place    | true  | 6 | – | – | – | – | – | – | – |
| 71 7.1 Landen+hoofdsteden | – | – | 7 | 1 | x | 100 | 300 | x | – | – |
| 72 7.2 België+Lux      | – | – | 7 | 1 | x | 40 | 120 | x | – | – |
| 73 7.3 FR/ES/PT        | – | – | 7 | 1 | x | 80 | 240 | x | – | – |
| 74 7.4 Duitsland       | – | – | 7 | 1 | x | 60 | 180 | x | – | – |
| 75 7.5 VK/Ierland      | – | – | 7 | 1 | x | 60 | 180 | x | – | – |
| 76 7.6 Midden-EU/Italië | – | – | 7 | 1 | x | 60 | 180 | x | – | – |
| 77 7.7 Oost-Europa     | – | – | 7 | 1 | x | 100 | 300 | x | – | – |
| 78 7.8 Noord-Europa    | – | – | 7 | 1 | x | 100 | 300 | x | – | – |
| 79 7.9 Zuidoost-Europa | – | – | 7 | 1 | x | 100 | 300 | x | – | – |
| 81–89 Groep-8 (9 sets) | – | – | 8 | 1 | x | 150–250 | 400–700 | x | – | – |
| 98 Daily               | – | false | – | 1 | – | – | – | – | true | – |
| 99 Bonus               | – | false | – | 1 | – | – | – | – | – | true |

### 4.3 Drie duidelijk gescheiden varianten

Uit de matrix vallen drie *kinds* te herkennen:

1. **Enkelvoudig (groep 5/6)** — heeft `quizType`, `fitOnStart`, `group`,
   meer niet. 11 sets: 54, 55, 56, 57, 61–67.
2. **Gefaseerd (groep 5.8 + 7/8)** — heeft `phases[]`, `bounds`,
   `clickCorrectKm`, `clickCloseKm`, `mastery: 1`, `group`. Géén top-level
   `quizType` of `fitOnStart`. 18 sets: 58, 71–79, 81–89.
3. **Mixed (daily/bonus)** — heeft `daily: true` óf `bonus: true`,
   `mastery: 1`, `fitOnStart: false`. Géén `group`, geen `quizType`,
   geen `phases`. 2 sets: 98, 99.

### 4.4 Problemen met de huidige vorm

- **Null-guard-verplicht overal**. Elke consument moet `_set.phases?` of
  `_set.daily || _set.bonus` checken. Voorbeelden:
  - `index.html:1260` — `set.fitOnStart` wordt als boolean gelezen, maar is
    bij gefaseerde sets `undefined`; de ternary `set.fitOnStart ? A : B`
    gebruikt dus stilzwijgend het `else`-pad.
  - `index.html:1379`, `:2001`, `:2025`, `:2330` — elk een variatie op
    `set.phases ? … : set.quizType`.
  - `index.html:2002-2003` — de drie guard-conditions (`!phases &&
    !mixed && quizType === 'province'`) staan letterlijk drie keer in
    showEnd.
- **Geen defaults**. `mastery` wordt via `SETS[s].mastery != null`
  gehaald — elke gefaseerde/mixed set zet `mastery: 1`, elke enkelvoudige
  set zet hem *niet* (valt terug op `MASTERY_MC=3`/`MASTERY_TEXT=1` via
  `mastery()` op `index.html:1172-1175`). Dat is impliciet.
- **`fitOnStart` heeft per variant-type een andere semantiek**: bij
  gefaseerd is hij altijd `undefined` (niet relevant, want `bounds`
  overrulet); bij mixed is hij expliciet `false`. In `startQuiz`
  (`index.html:2408-2414`) is de flow:
  `mixed → skip; bounds → fitBounds; fitOnStart → fitBounds op activeCities; else → NL_BOUNDS`.
  Dat werkt correct maar de volgorde is een impliciete prioriteit.

### 4.5 Voorgestelde vorm — discriminated union

Eén helper-functie in `cities.js` die elke set normaliseert naar een
gemeenschappelijke shape:

```js
// Voorgestelde shape — met 'kind' als discriminator
// kind: 'simple' | 'phased' | 'daily' | 'bonus'
// Elke variant bepaalt welke velden verplicht zijn.

function makeSimpleSet({ name, quizType, group, fitOnStart = false }) {
  return { kind: 'simple', name, quizType, group, fitOnStart,
           mastery: null /* valt terug op default per gameMode */ };
}
function makePhasedSet({ name, group, bounds, clickCorrectKm, clickCloseKm,
                         phases, mastery = 1 }) {
  return { kind: 'phased', name, group, bounds, clickCorrectKm,
           clickCloseKm, phases, mastery };
}
function makeDailySet()  { return { kind: 'daily',  name: '📅 Uitdaging van vandaag',
                                    mastery: 1, fitOnStart: false }; }
function makeBonusSet()  { return { kind: 'bonus',  name: 'Bonus: door elkaar',
                                    mastery: 1, fitOnStart: false }; }

// Alle consumers doen daarna:
//   switch (set.kind) { case 'phased': … }
// in plaats van drie verschillende ad-hoc guards.
```

Voordelen:

- Elke call-site (er zijn er >25, zie regels in 4.4) wordt één `switch`
  of één defaulted read.
- Nieuwe varianten (bv. `practice` voor vrije modus) worden een nieuwe
  `kind` met eigen factory — geen ripple-effect door elk consument.
- Tests in `test.js` (sectie "set-definities") kunnen per `kind` valideren
  — exhaustief ipv `if (set.phases) {…}`.

### 4.6 LOC-impact schatting

- `SETS`-declaratie groeit met ~20 LOC (factory-aanroepen in plaats van
  object-literals). **Winst zit niet in `cities.js`** — zit in de consumers.
- Aan de consumentkant zijn 25+ plekken met null-guards. Een ruwe
  schatting: ~40–60 LOC verdwijnt over `index.html` heen wanneer
  `set.phases?.…` vervangen wordt door `set.kind === 'phased' && set.phases.…`
  — geen winst qua lijnen, wel qua compacte discriminator-logica. Een
  pragmatischer meting: 8–10 ad-hoc guards worden 1 switch-statement per
  consument.

### 4.7 Voorgestelde volgorde

Doen **na** de router-herziening (hoofdstuk 7), want die bepaalt deels wat
een "set" is in navigatie-termen. Geen quick win — 1 sprint, omdat elk
consument bekeken moet worden.

---

## 5. Progress / `sessionStorage` / backwards-compat

### 5.1 Alle keys in gebruik

| Key | Scope | Waar gezet | Waar gelezen | Inhoud |
|---|---|---|---|---|
| `qp_<setNr>_<mode>` | `sessionStorage` | `saveProgress` `index.html:2438` | `initLevel:1474`, `restoreProgress:2444` | `{ streak, sessionOk, sessionErr, hadWrong, bonusCities? }` |
| `selectedGroup` | `sessionStorage` | `_renderLevelSelect:2103` | `getSelectedGroup:1294`, `_renderLevelSelect:2089` | `"5"` \| `"6"` \| `"7"` \| `"8"` |
| `tq_daily_<YYYY-MM-DD>` | `localStorage` | `showEnd:2010` | alleen geschreven — niet gelezen elders in code | emoji-string `🟢🟢🔴…` |
| `devMenuSet` | `localStorage` | dev-menu `:2668` | dev-menu `:2631` | set-nummer als string |

Géén hash-fragment, géén cookies, géén IndexedDB.

### 5.2 Dubbel-lezen van dezelfde key

`qp_<setNr>_<mode>` wordt op twee plekken uitgelezen:

- `initLevel:1474` — **alleen** voor `saved.bonusCities` (bonus-pool
  hydrateren vóórdat `activeCities` bestaat).
- `restoreProgress:2444` — **alle andere velden** (`streak`, `sessionOk`,
  etc.), aangeroepen vanuit `startQuiz:2363` *nadat* `initLevel`
  `activeCities` heeft gezet.

**Dit is volgordelijk verdeeld, geen race** — maar het maakt de storage-
semantiek moeilijk te lezen. Een gecombineerde `loadSavedSession(setNr,
mode)` die één keer leest en zowel bonus-pool als streak/sessionOk in één
object retourneert is duidelijker. LOC-impact: neutraal, wel -1 parse.

### 5.3 Backwards-compat in `initLevel` (regels 1476–1488)

```js
items = saved.bonusCities.map(x => {
  // Backwards-compat: oude opslag was array van strings (alleen steden).
  if (typeof x === 'string') {
    const c = ALL_CITIES.find(cc => cc.name === x);
    if (c) c._itemType = 'place';
    return c;
  }
  …
```

**Historische context (uit commit-log en issue #80):**

- Commit `a8a3150 feat(#80): redesign daily + bonus for Geobas 5-8 with
  mixed-type pools` — introduceert heterogene pool. Dat is wanneer het
  opslag-formaat veranderde van `string[]` naar `{name, _itemType}[]`.
- Commit `af886ec fix(#80): don't reset daily/bonus map to NL_BOUNDS on
  startQuiz` en `829944e chore(#80): bump version to v2.18.0 + README for
  daily/bonus redesign` — v2.18.0 uit dit release-paar.
- Huidige versie: v2.18.4. Tussen v2.18.0 en v2.18.4 zit krap 1 week
  reguliere werktijd.

**Is de compat-tak nog nodig?**

- `sessionStorage` overleeft een **browser-tab-restart niet** (anders dan
  `localStorage`). De compat-tak is dus alleen relevant voor gebruikers
  die:
  1. een tab met de bonus geopend hielden van vóór v2.18.0, en
  2. in diezelfde tab verder spelen na de update.
- v2.18.0 staat sinds een week. Reëel aantal tabs dat zó lang open blijft
  op een *topografie-oefenapp voor groep 5/8*: **praktisch nul**. Zelfs
  als het er een paar zijn, is de worst case dat de bonus-pool niet
  herstelt en er `buildBonusPool(g)` opnieuw wordt gecalled — geen
  crash.
- De compat-tak is 13 LOC (1476–1488, inclusief de `if (typeof x ===
  'string')` block). Weg met zekerheid.

**Nog één argument om hem tóch even te laten**: test.js bevat mogelijk
een assertie dat oude storage niet breekt. Quick-grep vóór sloop:
```
grep -n "typeof x === 'string'" test.js
```
(geen match verwacht op basis van deze audit — maar verifiëren tijdens
de eigenlijke refactor.)

### 5.4 `dailyAnswerKey` vs naïeve naam

`dailyAnswerKey(city)` (`index.html:1357`) bouwt `${_itemType}:${name}`
zodra een item een `_itemType` heeft. Dit is **correcte dedup voor
mixed-pools** (groep 8 kan "Panama" als land én stad hebben, zie comment
op `:1321`). Alleen gebruikt in `recordCorrect:1801`, `recordWrong:1829`
en `showEnd:2007` — samen drie call-sites.

Observatie: **niet alle state-maps gebruiken deze dedup**. `streak` keyt
ná `c.name` op regel 1804 (`streak[city.name]++`). `c._hadWrong` keyt op
`c.name`. `hadWrong` in `saveProgress` idem. De daily-dedup is dus *alleen*
effectief voor de eindscore, niet voor streak/mastery. Een toekomstige
regressiebron: als het ooit gebeurt dat "Panama-stad" én "Panama-land" in
dezelfde bonus-sessie komen, delen ze streak. `buildMixedPool`
(`index.html:1322-1326`) dedupeert nu proactief op `name` om dit te
voorkomen — een correcte workaround, maar de *state shape* zelf is het
eigenlijke probleem.

### 5.5 LOC-impact

- Backwards-compat slopen: **-13 LOC**.
- Gecombineerde `loadSavedSession`: **-0 LOC** (refactor, geen krimp).
- State-keys naar `(itemType, name)`-tuples promoveren (diepere refactor):
  waarschijnlijk **+10 LOC** over alle call-sites heen; risico op
  regressie, niet quick-win.

### 5.6 Voorgestelde volgorde

- **Backwards-compat slopen** — trivial, direct doen zodra één minor
  uit de buurt van v2.18.0 zit (v2.19.x). Commit standalone.
- Gecombineerde `loadSavedSession` — doen samen met de persistence-
  module-extractie uit hoofdstuk 1.5 (pure verhuizing).
- State-keys-dedup — pas overwegen als er een concrete regressie
  optreedt. Nu niet prioriteit.

---

## 6. `setHighlight` vs `setHighlightPolygon`

### 6.1 Beide functies in hun geheel

**`setHighlight(city)`** — `index.html:1154-1167` (14 LOC):

```js
function setHighlight(city) {
  if (highlightMarker) map.removeLayer(highlightMarker);
  highlightMarker = L.marker([city.lat, city.lon], { icon: pulseIcon,
    interactive: false }).addTo(map);
  const _set = SETS[selectedSet];
  const isMixed = _set?.daily || _set?.bonus;
  if (isMixed) {
    map.flyTo([city.lat, city.lon], 8, { animate: true, duration: 0.6 });
  } else if (!map.getBounds().contains([city.lat, city.lon])) {
    map.panTo([city.lat, city.lon], { animate: true });
  }
}
```

**`setHighlightPolygon(type, item, mapMode)`** — `index.html:1045-1059` (15 LOC):

```js
function setHighlightPolygon(type, item, mapMode = false) {
  const t = polygonTypes[type];
  Object.entries(t.layers).forEach(([name, layer]) => {
    const f = layer.feature || { properties: {} };
    if (name === item.name) {
      layer.setStyle(styleForFeature(t, f, 'highlight'));
    } else if (mapMode && t.styles.hidden) {
      layer.setStyle(streak[name] >= mastery() ? styleForFeature(t, f, 'mastered') : t.styles.hidden);
    } else {
      layer.setStyle(streak[name] >= mastery() ? styleForFeature(t, f, 'mastered') : styleForFeature(t, f, 'default'));
    }
  });
  if (t.afterHighlight) t.afterHighlight.call(t, item);
}
```

### 6.2 Call-sites

- `renderQuestion:1688` → `setHighlightPolygon(_rqQt, currentCity)`
- `renderQuestion:1691` → `setHighlight(currentCity)` (place-type)
- `handleMapClick:1871` → `setHighlightPolygon('water', city, true)`
- `handleMapClick:1873` → `setHighlightPolygon('country', city)`
- `handleMapClick:1875` → `setHighlightPolygon('province', city)`
- `handleMapClick:1877` → `setHighlight(city)` (place-type)

Elke call is al dispatch-gewijs gesplitst per quizType door de caller. De
dispatcher staat telkens letterlijk in de caller — zie bv.
`renderQuestion:1657-1691` waar `isProvince/isWater/isCountry` flags
bepalen welke highlight wordt gebruikt.

### 6.3 Wat ze delen

**Niets, qua uitvoering.** Marker-highlighting (pulsing DIV-icon op
lat/lon) en polygon-highlighting (layer-styling + bringToFront) zijn
fundamenteel verschillende Leaflet-operaties.

**Wel gedeeld**: de coupling aan `activeCities`, `streak`, `mastery()`,
en het `afterHighlight`-gedrag (zoom naar feature/punt). In een ideale
wereld zou **elke quizType een polygonType-register-entry hebben**
inclusief `place`, met een `highlightStrategy` die óf een pulse-marker zet
óf een polygon-style. Dat zou het register uit hoofdstuk 2 uitbreiden met
een vierde entry:

```js
polygonTypes.place = {
  featureData: null,        // ongebruikt
  layers: {},               // ongebruikt
  styles: { },              // markers hebben NORMAL_STYLE / MASTERED_STYLE
  highlight: (item) => { /* pulseIcon-logica van setHighlight */ },
  afterHighlight: (item) => { /* flyTo/panTo */ },
};
```

Als je `setHighlightPolygon` hernoemt naar `setHighlight(type, item,
mapMode)` en de `type === 'place'`-tak intern pulseIcon laat zetten,
verdwijnen zowel `setHighlight` als de caller-side dispatch.

### 6.4 Dedup-schatting

- `setHighlight` + `setHighlightPolygon` = **29 LOC**.
- Unified `setHighlight(type, item, mapMode)` met register-lookup: ~22 LOC
  (geschat — alle bestaande branches + place-branch in één switch). **Netto
  -7 LOC in de functies zelf.**
- Aan de caller-kant: `renderQuestion` verliest 4 regels (1657-1692 wordt
  compacter — één dispatch-call ipv eerst flags berekenen en dan
  kiezen). `handleMapClick` verliest 6 regels (1870-1878 wordt één
  dispatch-regel). **Netto -10 LOC caller-side.**

**Totaal ≈ -15 tot -20 LOC** én unieke dispatch-waarheidsbron.

### 6.5 Voorgestelde volgorde

Doen **na** hoofdstuk 3 (`buildPolygonLayer`-dedup) en **na** hoofdstuk 2
(`polygonTypes` generiek). De unified `setHighlight` leunt op het
uitgebreide register. Ziet er uit als een natuurlijke derde stap in
dezelfde map/polygon-sprint.

---

## 7. Dev-menu + URL deep-link + screen-navigatie

### 7.1 De drie navigatie-systemen

| # | Systeem | Regels | Triggers | Resulteert in |
|---|---|---|---|---|
| A | **`history.pushState` / `popstate`** | 2206–2217, 2284–2309, 2311–2313, 2471–2481, 2534 | `selectLevel`, `showStartScreen`, `startQuiz`, browser-back | `popstate` → re-render via `_renderStartScreen` of `_renderModeSelect` |
| B | **`?set=…&mode=…&phase=…` deep-link** | 2536–2557 | bij page-load, alleen als `?set` aanwezig | `_maybeDeepLink` → `_renderModeSelect` óf direct `startQuiz` |
| C | **Dev-menu** | 2563–2672 | zichtbaar op `*.workers.dev` of `?dev=1` | knop-klik → `selectedSet = set; startQuiz(mode, phase)` |

Plus een vierde implicatie (niet een eigen system, wel een **screen-
switcher**):

- **Directe DOM-manipulatie** door elke render-functie: elke render-functie
  (`_renderStartScreen`, `_renderModeSelect`, `startQuiz`, `showEnd`)
  toont/verbergt divs in hun eigen IIFE. Bv. `_renderStartScreen:2294`
  verbergt 5 divs en toont `#start-screen`; `showEnd:1994` doet dezelfde
  dans omgekeerd.

### 7.2 Entry-points per systeem

**System A — history-based:**
- `history.pushState({ screen: 'quiz', set, mode }, '')` — `:2211, :2313`
- `history.pushState({ screen: 'mode-select', set }, '')` — `:2215`
- `history.replaceState({ screen: 'level-select' }, '')` — `:2307, :2534`
- `history.replaceState({ screen: 'mode-select', set }, '')` — `:2548`
- `popstate` handler — `:2471-2481` — leest `e.state.screen` en dispatcht.

**System B — deep-link-based:**
- URL params `set`, `mode`, `phase` — gelezen in `_maybeDeepLink:2539-2556`.
- Fallback-pad: als `_maybeDeepLink` niets doet → `showStartScreen()` —
  `:2560`.
- Roept `_renderModeSelect` of `startQuiz` direct aan — het **creëert
  geen `history.pushState`** voor de deep-link-staat (alleen
  `replaceState` voor mode-select op `:2548`). Resultaat: terug-navigeren
  vanuit een deep-link gaat direct naar de vorige pagina / de `about:`
  page.

**System C — dev-menu:**
- Geheel eigen IIFE, bouwt `#dev-panel` via `document.createElement`.
- `dev-go`-knop `:2664-2671` schrijft `localStorage.devMenuSet` en roept
  `startQuiz(mode, phase)` aan. Die doet intern zelf een `pushState`.
- `window.__devMenuSync = syncToLive` (`:2656`) — zodat de game-loop op
  fase-wissel de dropdown kan resyncen. Dit is de enige hook van game →
  dev-menu.

**Screen-switcher (niet System D, maar de daadwerkelijke UI-impact):**
- Er is geen centraal `showScreen(name)`. Elk scherm wordt via een
  array-ish loop verborgen (zie `_renderStartScreen:2294`,
  `showEnd:1994`, `_renderModeSelect:2158`, `startQuiz:2391-2416`).
- De ID-lijsten zijn **niet identiek** tussen de vier render-functies:
  - `_renderStartScreen`: `['end-screen','map-wrap','question-box','score-bar','hard-panel']`
  - `showEnd`: `['map-wrap','question-box','hard-panel','score-bar']`
  - `_renderModeSelect`: `['end-screen','map-wrap','question-box','score-bar','hard-panel']`
  - `startQuiz:2391-2394`: hide `start-screen`, `end-screen`, `hard-panel`; show `map-wrap`
  Dit is een klassieke bron van spookstate-bugs (element dat wel verborgen
  had moeten worden maar blijft staan na een pad-wissel).

### 7.3 Kruisingen / conflicten

1. **Deep-link zonder history-entry** — bij inkomend `?set=72&mode=mc` doet
   de app `await startQuiz('mc', phase)` op `:2555`. `startQuiz` zelf doet
   `history.pushState({ screen: 'quiz', set, mode })` op `:2313`. Dus
   de geschiedenis wordt wel correct bij `?set=72` — maar niet bij
   `?set=72` zónder mode, waar `_renderModeSelect` via `replaceState`
   loopt. De twee paden zijn correct maar inconsistent.
2. **Dev-menu pusht niet** — `startQuiz` (intern aangeroepen) doet wel
   `pushState`, dus elke dev-menu-klik voegt een history-entry toe. Voor
   een dev-kortsluiting meestal niet gewenst; resultaat is dat `←`
   onverwachts terug-navigeert binnen de dev-sessie.
3. **Initiële `history.replaceState({ screen: 'level-select' }, '')` op
   `:2534`** wordt *altijd* uitgevoerd, ook als `_maybeDeepLink` daarna
   een eigen `replaceState` doet. Dubbel, maar niet schadelijk.
4. **Geen deep-link voor daily/bonus** — `_maybeDeepLink` accepteert geen
   `set=98` met de `daily=true` semantiek. In de praktijk werkt het wel
   (`SETS[98]` bestaat, `startQuiz` pakt het mixed-pad), maar er zijn
   geen tests op deze combinatie.
5. **Dev-menu + regular pushState kunnen out-of-sync raken** — het
   `__devMenuSync`-callback draait na elke `startQuiz`. Dat werkt, maar
   is een ad-hoc hook, geen bus. Als er ooit een tweede observer bijkomt
   (bv. analytics die op screen-change tikt), moet elk nieuw pad weer de
   hook expliciet aanroepen.

### 7.4 Is één authoritative router realistisch?

**Ja — met een duidelijk contract:**

```js
// Alle navigatie gaat via navigate(). Niemand anders raakt history/DOM aan.
navigate({ screen: 'level-select' });
navigate({ screen: 'mode-select', set: 72 });
navigate({ screen: 'quiz', set: 72, mode: 'mc', phase: 1 });
navigate({ screen: 'end', set: 72 });

// Intern:
// 1. history.pushState of replaceState (replace bij initial load / deep-link)
// 2. Roept render(state) aan die alle screen-visibility in één switch zet
// 3. Emit 'screen-change'-event (dev-menu, analytics) listenen daarop
```

Mits elke bestaande aanroepplek vervangen wordt, pakt dit meteen de
scherm-switcher-inconsistentie op (1 plek die alle 7 div-id's kent), en
loopt het dev-menu-sync via events in plaats van `window.__devMenuSync`.

**Haalbaarheid**: middelmatig-moeilijk. De bestaande code heeft geen
pointer-vrije navigatie — elke `popstate` leest `e.state.screen` en
dispatch al zelf. De router is dus *al aanwezig*, alleen als losse
fragmenten verspreid over 100+ LOC.

### 7.5 LOC-impact schatting

- Huidige navigatie-LOC verspreid over:
  - `selectLevel`: 12 LOC (`:2206-2217`)
  - `showStartScreen` + `_renderStartScreen`: 26 LOC (`:2284-2309`)
  - `startQuiz` UI-reset-prolog: ~10 LOC van de 113 in de functie
  - `popstate`: 13 LOC (`:2469-2481`)
  - `_maybeDeepLink`: 19 LOC (`:2538-2557`)
  - Initiële replaceState + bootstrap: 3 LOC (`:2533-2560`)
  - Scherm-hide-loops in render-functies: ~6 LOC x 4 plekken = 24 LOC
  - **Totaal ≈ 107 LOC** verspreid.
- Een centrale `router`-module (~60-80 LOC) vervangt dit + verdwijnt de
  scherm-hide-duplicatie. **Netto ≈ -30 tot -45 LOC**, plus de
  consistentie-winst.

### 7.6 Voorgestelde volgorde

Sprint-groot. Doen **ná** de kleinere quick wins (hoofdstukken 3, 5, 6).
Dit is de refactor met het grootste regressie-oppervlak — hier komen
Playwright-tests eerst:
- `tests/navigation.spec.js` en `tests/phases.spec.js` moeten groen
  blijven;
- Een extra `tests/router.spec.js` dekt: deep-link → back-button →
  level-select, dev-menu → back, daily deep-link.

---

## Prioriteitenlijst

Volgorde: quick wins eerst. Effort = t-shirt-grootte op 1–5 (1 = uurtje,
5 = sprint). Impact = leesbaarheid/LOC-besparing subjectief op 1–5.
Risico = kans op regressie op 1–5.

| # | Onderwerp | Effort | Impact | Risico | Afhankelijkheid |
|---|---|---|---|---|---|
| 1 | **Hoofdstuk 3** — `buildPolygonLayer` mixed-tak dedup | 1 | 2 | 1 | — |
| 2 | **Hoofdstuk 5.3** — `string[]`-backwards-compat in initLevel slopen | 1 | 1 | 1 | geen |
| 3 | **Hoofdstuk 1.2** — CSS-extractie naar losse files | 2 | 2 | 1 | — |
| 4 | **Hoofdstuk 1.3 (pure-logica subset)** — extract `haversine`/`levenshtein`/daily/smooth naar `src/game/*.js` + build-stap (esbuild of native modules) | 3 | 3 | 2 | #1 heeft voorrang |
| 5 | **Hoofdstuk 2 + 6** — `polygonTypes`-register generiek maken + `setHighlight` unified | 2 | 3 | 2 | #1 |
| 6 | **Hoofdstuk 4** — `SETS` → discriminated union (factories + switch per consument) | 3 | 3 | 3 | gaat door alle call-sites heen, dus liever na #7 |
| 7 | **Hoofdstuk 7** — centrale router + scherm-switcher | 4 | 4 | 4 | test-vangnet nodig (extra Playwright) |
| 8 | **Hoofdstuk 1.3 (UI-modules)** — scherm-rendering naar eigen modules | 3 | 2 | 2 | #7 voor duidelijk contract |
| 9 | **Hoofdstuk 5.4** — state-keys promoveren naar `(itemType, name)`-tuples | 2 | 1 | 3 | alleen als concrete regressie optreedt |

**Aanbeveling voor de komende 2 sprints**:

- **Sprint A** (snel, opruimen): #1, #2, #3, #5 — geen risico, duidelijke
  LOC-winst, tests hoeven nauwelijks aangepast.
- **Sprint B** (structureel): #7 (router) + #4 (pure-logica extract met
  build-stap). Beide hebben nieuwe test-coverage nodig. Niet combineren
  met #6 in dezelfde sprint; #6 is een eigen sprint zodra #7 staat.

---

## Niet in scope van deze audit

- **Nieuwe features** — geen nieuwe sets, geen nieuwe quiz-modi, geen
  nieuwe groepen.
- **Visuele redesign** — CSS mag opgesplitst maar de *styling* blijft
  identiek. Kleur- en layout-wijzigingen horen bij een eigen design-
  sprint (zie eventueel `/plan-design-review`).
- **Tooling** — geen bundler-keuze, geen migratie naar TypeScript, geen
  testrunner-switch. Die beslissingen zijn onderdeel van sprint B voor
  de eerste module-extractie (#4) maar staan los van deze audit.
- **Data-pipeline** — de `data/fetch-*.js` en `data/process-*.js` scripts
  staan niet in scope. Voor OSM-pipeline-bevindingen: zie de
  `osm-fetch`-skill.
- **OSM / geojson-data** — geen review van bronbestanden (`*.geojson`).
- **PWA / service worker / analytics** — geen review van `sw.js`,
  `manifest.json` of Matomo-integratie.
- **Cloudflare / deploy** — geen review van `.github/workflows/e2e.yml`
  of `wrangler.jsonc`.
- **Bestaand `REFACTORING.md`** — dit rapport vervangt niet, vult aan: de
  oude REFACTORING.md is geschreven bij v2.0-achtig en noemt toestanden
  die al opgelost zijn (bv. `buildProvinceLayer`/`buildWaterLayer` zijn
  al vervangen door `polygonTypes`-register en `buildPolygonLayer`).

---

## Appendix A — Verifieerbare feiten in dit rapport

Alle kernclaims zijn na te rekenen vanuit de huidige checkout:

```bash
# Totale bestandslengtes
wc -l index.html cities.js test.js                     # 2688 / 1170 / 2382
grep -n APP_VERSION index.html                         # :2220 v2.18.4
grep -c "^function " index.html                        # 79 top-level JS functies
awk '/^const SETS = \{/,/^\};/' cities.js | wc -l      # 240 regels SETS
```

Alle citatie-regels (`file:regel`) zijn op commit `a09b60b` (HEAD van
`dev`) geldig.
