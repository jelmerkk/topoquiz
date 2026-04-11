#!/usr/bin/env node
// Topografie Quiz — lokale testsuite
// Gebruik: node test.js

'use strict';

const { ALL_CITIES, ALL_PROVINCES, ALL_WATERS, ALL_COUNTRIES, SETS, cityRadius, NL_BOUNDS, EU_BOUNDS, WORLD_BOUNDS } = require('./cities.js');

// ── Pure logic (gespiegeld vanuit index.html) ─────────────────
// Houd synchroon met de implementatie in index.html.

function normalize(s) {
  return s.toLowerCase().trim().replace(/['\-\s]/g, '');
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function typoThreshold(normalizedName) {
  const l = normalizedName.length;
  if (l <= 4) return 0;
  if (l <= 8) return 1;
  return 2;
}

function matchInput(input, city) {
  const normInput = normalize(input);
  if (!normInput) return false;
  const allNames = [city.name, ...(city.aliases || [])];
  for (const name of allNames) {
    if (normalize(name) === normInput) return 'exact';
  }
  for (const name of allNames) {
    const normName = normalize(name);
    const dist = levenshtein(normInput, normName);
    if (dist <= typoThreshold(normName)) return 'close';
  }
  return false;
}

// ── Test framework ────────────────────────────────────────────

let passed = 0, failed = 0;

function expect(description, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.error(`  ✗ ${description}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n${title}`);
}

// ── Data-integriteit: ALL_CITIES ──────────────────────────────

section('ALL_CITIES — vereiste velden');

const NL_LAT = [50.5, 53.7];
const NL_LON = [3.2,  7.3];
const validSetNums = new Set(Object.keys(SETS).map(Number));

const missingFields = ALL_CITIES.filter(c =>
  !c.name || c.lat == null || c.lon == null || !c.pop || !c.sets?.length
);
expect('Elke stad heeft name, lat, lon, pop, sets', missingFields.length === 0,
  missingFields.map(c => c.name || '(naamloos)').join(', '));

// Steden die uitsluitend in sets met custom bounds (buiten NL) zitten mogen
// buiten Nederland liggen — bijv. Baltische hoofdsteden in set 70.
const outOfBounds = ALL_CITIES.filter(c => {
  const onlyNonNLSets = c.sets.every(s => SETS[s]?.bounds);
  if (onlyNonNLSets) return false;
  return c.lat < NL_LAT[0] || c.lat > NL_LAT[1] || c.lon < NL_LON[0] || c.lon > NL_LON[1];
});
expect('NL-steden hebben coördinaten binnen Nederland', outOfBounds.length === 0,
  outOfBounds.map(c => `${c.name} (${c.lat}, ${c.lon})`).join(', '));

const nonPositivePop = ALL_CITIES.filter(c => c.pop <= 0);
expect('Alle populatiewaarden zijn positief', nonPositivePop.length === 0,
  nonPositivePop.map(c => c.name).join(', '));

const names = ALL_CITIES.map(c => c.name);
const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
expect('Geen dubbele stadsnamen', duplicates.length === 0, duplicates.join(', '));

const invalidSetRefs = ALL_CITIES.flatMap(c =>
  c.sets.filter(s => !validSetNums.has(s)).map(s => `${c.name} → set ${s}`)
);
expect('Alle set-verwijzingen in ALL_CITIES zijn geregistreerd in SETS',
  invalidSetRefs.length === 0, invalidSetRefs.join(', '));

section('ALL_CITIES — set-dekking');

Object.entries(SETS).forEach(([num, set]) => {
  if (set.quizType === 'province') return; // provincies gebruiken ALL_PROVINCES
  if (set.quizType === 'water') return;    // wateren gebruiken ALL_WATERS
  if (set.bonus || set.daily) return;      // runtime-sampling, geen vaste set-filter
  if (set.phases) return;                  // gefaseerde sets: elke fase heeft eigen pool
  const count = ALL_CITIES.filter(c => c.sets.includes(Number(num))).length;
  expect(`Set ${set.name} heeft ≥ 4 steden (voor meerkeuze-afleiders)`, count >= 4,
    `heeft er ${count}`);
});

section('ALL_CITIES — provinciehoofdsteden');

const capitals = ALL_CITIES.filter(c => c.capital);
expect('Er zijn precies 12 provinciehoofdsteden', capitals.length === 12,
  `gevonden: ${capitals.length}`);
const capitalsInSet55 = capitals.filter(c => c.sets.includes(55));
expect('Alle provinciehoofdsteden zitten in set 55', capitalsInSet55.length === capitals.length,
  capitals.filter(c => !c.sets.includes(55)).map(c => c.name).join(', '));

section('ALL_PROVINCES');

expect('Er zijn precies 12 provincies', ALL_PROVINCES.length === 12,
  `gevonden: ${ALL_PROVINCES.length}`);

const provMissingFields = ALL_PROVINCES.filter(p => !p.name || p.lat == null || p.lon == null);
expect('Elke provincie heeft name, lat, lon', provMissingFields.length === 0,
  provMissingFields.map(p => p.name || '(naamloos)').join(', '));

const provOutOfBounds = ALL_PROVINCES.filter(p =>
  p.lat < NL_LAT[0] || p.lat > NL_LAT[1] || p.lon < NL_LON[0] || p.lon > NL_LON[1]
);
expect('Alle provinciecoördinaten liggen binnen Nederland', provOutOfBounds.length === 0,
  provOutOfBounds.map(p => `${p.name} (${p.lat}, ${p.lon})`).join(', '));

// Controleer dat elke hoofdstad ook een bijbehorende provinciehoofdstad heeft
const capitalNames = new Set(capitals.map(c => c.name));
const provinceNames = new Set(ALL_PROVINCES.map(p => p.name));
// Elke provinciehoofdstad (capital) moet bereikbaar zijn als set-55-stad
expect('Set 54 (provincies) bestaat en is quizType province',
  SETS[54]?.quizType === 'province');

section('SETS — structuur');

const setEntries = Object.entries(SETS);
expect('Er zijn sets gedefinieerd', setEntries.length > 0);

const VALID_QUIZ_TYPES = ['place', 'province', 'water', 'country'];
const invalidQuizTypes = setEntries.filter(([, s]) => {
  if (s.phases) return !s.phases.every(p => VALID_QUIZ_TYPES.includes(p.quizType));
  return !VALID_QUIZ_TYPES.includes(s.quizType);
});
expect('Alle sets hebben een geldig quizType (place, province, water of country)',
  invalidQuizTypes.length === 0,
  invalidQuizTypes.map(([n]) => n).join(', '));

const missingNames = setEntries.filter(([, s]) => !s.name?.trim());
expect('Alle sets hebben een naam', missingNames.length === 0,
  missingNames.map(([n]) => n).join(', '));

section('cityRadius()');

const radii = ALL_CITIES.map(c => cityRadius(c));
const minR = Math.min(...radii), maxR = Math.max(...radii);
expect('cityRadius geeft waarden terug in bereik 4–12', minR >= 4 && maxR <= 12,
  `bereik: ${minR}–${maxR}`);
expect('Amsterdam (grootste stad) heeft de grootste straal',
  cityRadius(ALL_CITIES.find(c => c.name === 'Amsterdam')) === maxR);

section('normalize()');

expect("normalize verwijdert hoofdletters",        normalize('Amsterdam')  === 'amsterdam');
expect("normalize verwijdert spaties",             normalize("Den Haag")   === "denhaag");
expect("normalize verwijdert koppeltekens",        normalize("s-Hertogenbosch") === "shertogenbosch");
expect("normalize verwijdert apostrofs",           normalize("'s-Gravenhage")   === "sgravenhage");
expect("normalize trimt witruimte",                normalize("  Assen  ")  === 'assen');

section('levenshtein()');

expect('levenshtein("", "") = 0',                  levenshtein('', '') === 0);
expect('levenshtein("abc", "abc") = 0',            levenshtein('abc', 'abc') === 0);
expect('levenshtein("abc", "ab") = 1',             levenshtein('abc', 'ab') === 1);
expect('levenshtein("kitten", "sitting") = 3',     levenshtein('kitten', 'sitting') === 3);
expect('levenshtein("tilburg", "tilburg") = 0',    levenshtein('tilburg', 'tilburg') === 0);
expect('levenshtein("tilburg", "tilbuurg") = 1',   levenshtein('tilburg', 'tilbuurg') === 1);

section('typoThreshold()');

expect('Namen ≤ 4 tekens: 0 fouten toegestaan',  typoThreshold('oss') === 0);
expect('Namen 5–8 tekens: 1 fout toegestaan',    typoThreshold('almelo') === 1);
expect('Namen ≥ 9 tekens: 2 fouten toegestaan',  typoThreshold('amsterdam') === 2);

section('matchInput() — concrete steden');

const amsterdam = ALL_CITIES.find(c => c.name === 'Amsterdam');
const denHaag   = ALL_CITIES.find(c => c.name === 'Den Haag');
const oss       = ALL_CITIES.find(c => c.name === 'Oss');

expect('Exact goed antwoord → "exact"',            matchInput('Amsterdam', amsterdam) === 'exact');
expect('Hoofdletterongevoelig → "exact"',           matchInput('amsterdam', amsterdam) === 'exact');
expect('Typfout in lang woord → "close"',           matchInput('Amsturdam', amsterdam) === 'close');
expect('Alias geaccepteerd → "exact"',              matchInput("'s-Gravenhage", denHaag) === 'exact');
expect('Verkeerd antwoord → false',                 matchInput('Rotterdam', amsterdam) === false);
expect('Leeg antwoord → false',                     matchInput('', amsterdam) === false);
expect('Korte naam (Oss): geen typfouten toegestaan → false bij 1 fout',
  matchInput('Oss', oss) === 'exact' && matchInput('Osl', oss) === false);

// ── Daily Challenge — pure logica (gespiegeld vanuit index.html) ──────────────

function makeRng(seed) {
  let s = seed;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ s >>> 15, s | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function dateSeed(dateStr) {
  return dateStr.split('-').reduce((acc, n) => acc * 10000 + parseInt(n, 10), 0);
}

function seededShuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dailyCities(dateStr) {
  const rng = makeRng(dateSeed(dateStr));
  return seededShuffle(ALL_CITIES, rng).slice(0, 10);
}

function dailyResultEmoji(results) {
  return results.map(r => r ? '🟢' : '🔴').join('');
}

section('makeRng() — seeded pseudo-random generator');

const rng1 = makeRng(12345);
const seq1 = [rng1(), rng1(), rng1()];
const rng2 = makeRng(12345);
const seq2 = [rng2(), rng2(), rng2()];
expect('Zelfde seed geeft dezelfde reeks', JSON.stringify(seq1) === JSON.stringify(seq2));
expect('Waarden liggen tussen 0 en 1', seq1.every(v => v >= 0 && v < 1));
const rng3 = makeRng(99999);
const seq3 = [rng3(), rng3(), rng3()];
expect('Andere seed geeft andere reeks', JSON.stringify(seq1) !== JSON.stringify(seq3));

section('dateSeed()');

expect('dateSeed geeft een getal terug', typeof dateSeed('2026-03-18') === 'number');
expect('Verschillende datums geven verschillende seeds',
  dateSeed('2026-03-18') !== dateSeed('2026-03-19'));
expect('Zelfde datum geeft altijd dezelfde seed',
  dateSeed('2026-03-18') === dateSeed('2026-03-18'));

section('dailyCities()');

const dc1 = dailyCities('2026-03-18');
const dc2 = dailyCities('2026-03-18');
const dc3 = dailyCities('2026-03-19');
expect('dailyCities geeft altijd 10 steden', dc1.length === 10);
expect('Zelfde datum → zelfde steden',
  dc1.map(c => c.name).join() === dc2.map(c => c.name).join());
expect('Andere datum → andere steden',
  dc1.map(c => c.name).join() !== dc3.map(c => c.name).join());
expect('Alle steden komen uit ALL_CITIES',
  dc1.every(c => ALL_CITIES.includes(c)));
expect('Geen dubbele steden in dagelijkse selectie',
  new Set(dc1.map(c => c.name)).size === 10);

section('dailyResultEmoji()');

expect('Correct → 🟢',               dailyResultEmoji([true])           === '🟢');
expect('Fout → 🔴',                  dailyResultEmoji([false])          === '🔴');
expect('Gemengd resultaat klopt',    dailyResultEmoji([true,false,true]) === '🟢🔴🟢');
expect('10 resultaten → 10 emoji',   dailyResultEmoji(Array(10).fill(true)).length === 20); // 10 × 2-byte emoji

// ── Kaart-klik modus — pure logica (gespiegeld vanuit index.html) ─────────────

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CLICK_CORRECT_KM = 20;
const CLICK_CLOSE_KM   = 60;

// Gespiegel van index.html — houd synchroon met implementatie.
// Signature: clickResult(distKm, setNumber)
// - Leest clickCorrectKm/clickCloseKm uit SETS[setNumber] als die bestaan
// - Anders: fitOnStart halveert de drempel (bestaand gedrag)
// - Geen setNumber: gebruikt globale defaults
function clickResult(distKm, setNumber) {
  const set = (typeof setNumber === 'number' && SETS[setNumber]) ? SETS[setNumber] : {};
  const correctKm = set.clickCorrectKm ?? (set.fitOnStart ? CLICK_CORRECT_KM / 2 : CLICK_CORRECT_KM);
  const closeKm   = set.clickCloseKm   ?? (set.fitOnStart ? CLICK_CLOSE_KM / 2   : CLICK_CLOSE_KM);
  if (distKm < correctKm) return 'correct';
  if (distKm < closeKm)   return 'close';
  return 'wrong';
}

section('haversine()');

const ams = ALL_CITIES.find(c => c.name === 'Amsterdam');
const rot = ALL_CITIES.find(c => c.name === 'Rotterdam');
const gro = ALL_CITIES.find(c => c.name === 'Groningen');
const maa = ALL_CITIES.find(c => c.name === 'Maastricht');

const distAmsAms = haversine(ams.lat, ams.lon, ams.lat, ams.lon);
expect('Zelfde punt → 0 km', distAmsAms < 0.01);

const distAmsRot = haversine(ams.lat, ams.lon, rot.lat, rot.lon);
expect('Amsterdam–Rotterdam ≈ 50–80 km', distAmsRot > 50 && distAmsRot < 80,
  `was ${Math.round(distAmsRot)} km`);

const distAmsGro = haversine(ams.lat, ams.lon, gro.lat, gro.lon);
expect('Amsterdam–Groningen ≈ 130–180 km', distAmsGro > 130 && distAmsGro < 180,
  `was ${Math.round(distAmsGro)} km`);

const distAmsMaa = haversine(ams.lat, ams.lon, maa.lat, maa.lon);
expect('Amsterdam–Maastricht ≈ 155–220 km', distAmsMaa > 155 && distAmsMaa < 220,
  `was ${Math.round(distAmsMaa)} km`);

expect('Retourwaarde is een getal', typeof distAmsRot === 'number');

section('clickResult() — NL-sets (geen clickCorrectKm, geen fitOnStart)');

// Set 54 (provincies): geen fitOnStart, geen clickCorrectKm → globale NL defaults 20/60
expect('set 54: 0 km → correct',   clickResult(0,  54) === 'correct');
expect('set 54: 15 km → correct',  clickResult(15, 54) === 'correct');
expect('set 54: 19 km → correct',  clickResult(19, 54) === 'correct');
expect('set 54: 20 km → close',    clickResult(20, 54) === 'close');
expect('set 54: 40 km → close',    clickResult(40, 54) === 'close');
expect('set 54: 59 km → close',    clickResult(59, 54) === 'close');
expect('set 54: 60 km → wrong',    clickResult(60, 54) === 'wrong');
expect('set 54: 150 km → wrong',   clickResult(150,54) === 'wrong');

// Geen setNumber: val terug op globale defaults
expect('geen set: 0 km → correct', clickResult(0)    === 'correct');
expect('geen set: 20 km → close',  clickResult(20)   === 'close');
expect('geen set: 60 km → wrong',  clickResult(60)   === 'wrong');

section('clickResult() — ingezoomd (fitOnStart: true, sets 61–67)');

// Set 61 (Overijssel): fitOnStart → halve drempel: correct 10km, close 30km
expect('set 61: 0 km → correct',   clickResult(0,  61) === 'correct');
expect('set 61: 9 km → correct',   clickResult(9,  61) === 'correct');
expect('set 61: 10 km → close',    clickResult(10, 61) === 'close');
expect('set 61: 29 km → close',    clickResult(29, 61) === 'close');
expect('set 61: 30 km → wrong',    clickResult(30, 61) === 'wrong');
expect('set 61: 60 km → wrong',    clickResult(60, 61) === 'wrong');

section('clickResult() — EU-set (set 70, clickCorrectKm: 60, clickCloseKm: 180)');

// Set 70 heeft expliciete EU-drempels die fitOnStart overriden
expect('set 70: 0 km → correct',    clickResult(0,   70) === 'correct');
expect('set 70: 50 km → correct',   clickResult(50,  70) === 'correct');
expect('set 70: 59 km → correct',   clickResult(59,  70) === 'correct');
expect('set 70: 60 km → close',     clickResult(60,  70) === 'close');
expect('set 70: 100 km → close',    clickResult(100, 70) === 'close');
expect('set 70: 179 km → close',    clickResult(179, 70) === 'close');
expect('set 70: 180 km → wrong',    clickResult(180, 70) === 'wrong');
expect('set 70: 300 km → wrong',    clickResult(300, 70) === 'wrong');

section('Bounds-constanten en set 70 definitie');

expect('NL_BOUNDS is gedefinieerd',    Array.isArray(NL_BOUNDS) && NL_BOUNDS.length === 2);
expect('EU_BOUNDS is gedefinieerd',    Array.isArray(EU_BOUNDS) && EU_BOUNDS.length === 2);
expect('WORLD_BOUNDS is gedefinieerd', Array.isArray(WORLD_BOUNDS) && WORLD_BOUNDS.length === 2);
expect('Set 70 bestaat in SETS',       !!SETS[70]);
expect('Set 70 heeft bounds (Baltisch viewport)', Array.isArray(SETS[70]?.bounds) && SETS[70].bounds[0][0] === 52 && SETS[70].bounds[1][1] === 30);
expect('Set 70 heeft clickCorrectKm 60', SETS[70]?.clickCorrectKm === 60);
expect('Set 70 heeft clickCloseKm 180',  SETS[70]?.clickCloseKm === 180);
expect('Set 70 is groep 7',             SETS[70]?.group === 7);

// ── ALL_WATERS ────────────────────────────────────────────────

section('ALL_WATERS — structuur');

expect('ALL_WATERS is gedefinieerd', Array.isArray(ALL_WATERS));
expect('ALL_WATERS heeft precies 20 wateren (16 NL + 4 Baltisch)', ALL_WATERS.length === 20,
  `heeft er ${ALL_WATERS?.length}`);

const waterMissingFields = ALL_WATERS.filter(w => !w.name || w.lat == null || w.lon == null);
expect('Elk water heeft name, lat, lon', waterMissingFields.length === 0,
  waterMissingFields.map(w => w.name || '(naamloos)').join(', '));

// Wateren met sets-veld zijn set-specifiek (bijv. Baltisch) en mogen buiten NL liggen.
const waterOutOfBounds = ALL_WATERS.filter(w => {
  if (w.sets) return false; // set-specifieke wateren mogen buiten NL liggen
  return w.lat < NL_LAT[0] || w.lat > NL_LAT[1] || w.lon < NL_LON[0] || w.lon > NL_LON[1];
});
expect('NL-watercoördinaten liggen binnen Nederland', waterOutOfBounds.length === 0,
  waterOutOfBounds.map(w => `${w.name} (${w.lat}, ${w.lon})`).join(', '));

const waterNames = ALL_WATERS.map(w => w.name);
const waterDuplicates = waterNames.filter((n, i) => waterNames.indexOf(n) !== i);
expect('Geen dubbele waternamen', waterDuplicates.length === 0, waterDuplicates.join(', '));

const VERWACHTE_WATEREN = [
  'Noordzee', 'Waddenzee', 'Oosterschelde', 'Westerschelde',
  'Rijn', 'IJssel', 'Neder-Rijn', 'Lek', 'Waal',
  'Maas', 'Oude Maas', 'Bergse Maas', 'Eems',
  'Noordzeekanaal', 'Amsterdam-Rijnkanaal', 'Nieuwe Waterweg',
];
VERWACHTE_WATEREN.forEach(naam => {
  expect(`${naam} aanwezig in ALL_WATERS`, ALL_WATERS.some(w => w.name === naam));
});

section('Set 57 — definitie');

expect('Set 57 bestaat in SETS', !!SETS[57]);
expect('Set 57 heeft naam die Wateren bevat', SETS[57]?.name?.includes('Wateren'));
expect('Set 57 heeft quizType water', SETS[57]?.quizType === 'water');
expect('Set 57 heeft fitOnStart false', SETS[57]?.fitOnStart === false);

// ── Set 67: Noord-Holland ─────────────────────────────────────

section('Set 67 — definitie');

expect('Set 67 bestaat in SETS', !!SETS[67]);
expect('Set 67 heeft naam die Noord-Holland bevat',
  SETS[67]?.name?.includes('Noord-Holland'));
expect('Set 67 heeft quizType place', SETS[67]?.quizType === 'place');
expect('Set 67 heeft fitOnStart true', SETS[67]?.fitOnStart === true);

section('Set 67 — steden');

const SET67_VERWACHT = [
  'Den Helder', 'Alkmaar', 'Hoorn', 'Purmerend', 'Zaanstad',
  'Haarlem', 'Amsterdam', 'Hilversum',
  'Enkhuizen', 'Volendam', 'IJmuiden', 'Zandvoort',
  'Amstelveen', 'Aalsmeer', 'Bussum',
];

SET67_VERWACHT.forEach(naam => {
  const city = ALL_CITIES.find(c => c.name === naam);
  expect(`${naam} bestaat in ALL_CITIES`, !!city);
  expect(`${naam} zit in set 67`, city?.sets?.includes(67));
});

const count67 = ALL_CITIES.filter(c => c.sets.includes(67)).length;
expect(`Set 67 heeft precies ${SET67_VERWACHT.length} steden`, count67 === SET67_VERWACHT.length,
  `heeft er ${count67}`);

// ── distanceToWater — pure logica ────────────────────────────

// Gespiegel vanuit index.html — houd synchroon met implementatie.

function pointToSegmentDist(lat, lon, lat1, lon1, lat2, lon2) {
  const dx = lat2 - lat1, dy = lon2 - lon1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((lat - lat1) * dx + (lon - lon1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return haversine(lat, lon, lat1 + t * dx, lon1 + t * dy);
}

function pointInPolygon(lat, lon, coords) {
  // coords zijn [lon, lat] (GeoJSON-volgorde)
  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const lon1 = coords[i][0], lat1 = coords[i][1];
    const lon2 = coords[j][0], lat2 = coords[j][1];
    if (((lat1 > lat) !== (lat2 > lat)) &&
        (lon < (lon2 - lon1) * (lat - lat1) / (lat2 - lat1) + lon1)) {
      inside = !inside;
    }
  }
  return inside;
}

function distanceToWaterGeometry(lat, lon, feature) {
  const geom = feature.geometry;
  const coords = geom.coordinates;
  if (geom.type === 'Polygon') {
    if (pointInPolygon(lat, lon, coords[0])) return 0;
    let minDist = Infinity;
    const ring = coords[0];
    for (let i = 0; i < ring.length - 1; i++) {
      const d = pointToSegmentDist(lat, lon, ring[i][1], ring[i][0], ring[i+1][1], ring[i+1][0]);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }
  if (geom.type === 'LineString') {
    let minDist = Infinity;
    for (let i = 0; i < coords.length - 1; i++) {
      const d = pointToSegmentDist(lat, lon, coords[i][1], coords[i][0], coords[i+1][1], coords[i+1][0]);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }
  return Infinity;
}

section('distanceToWaterGeometry() — LineString');

const waalFeature = {
  geometry: {
    type: 'LineString',
    coordinates: [
      [5.98, 51.88], [5.50, 51.82], [4.88, 51.81],
    ],
  },
};

const distOnWaal = distanceToWaterGeometry(51.85, 5.30, waalFeature);
expect('Punt op de Waal → < 5 km', distOnWaal < 5, `was ${Math.round(distOnWaal)} km`);

const distFarFromWaal = distanceToWaterGeometry(53.2, 6.5, waalFeature);
expect('Groningen → ver van Waal (> 100 km)', distFarFromWaal > 100, `was ${Math.round(distFarFromWaal)} km`);

section('distanceToWaterGeometry() — Polygon');

const noordzeeFeature = {
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [3.37, 51.37], [3.30, 51.45], [3.35, 51.55], [3.50, 51.70],
      [3.65, 51.82], [3.85, 51.90], [4.00, 51.96], [4.22, 52.08],
      [4.56, 52.54], [4.79, 52.96], [4.20, 52.96], [3.80, 52.72],
      [3.40, 52.22], [3.20, 51.96], [3.10, 51.70], [3.37, 51.37],
    ]],
  },
};

const distInNoordzee = distanceToWaterGeometry(52.0, 3.7, noordzeeFeature);
expect('Punt in Noordzee → 0 km', distInNoordzee === 0, `was ${Math.round(distInNoordzee)} km`);

const distOutsideNoordzee = distanceToWaterGeometry(52.37, 4.90, noordzeeFeature);
expect('Amsterdam → buiten Noordzee (> 0 km)', distOutsideNoordzee > 0, `was ${Math.round(distOutsideNoordzee)} km`);

section('pointInPolygon()');

// Simpele rechthoek: lon 4.0–5.0, lat 52.0–53.0 (coords: [lon, lat])
const rect = [[4.0, 52.0], [5.0, 52.0], [5.0, 53.0], [4.0, 53.0], [4.0, 52.0]];
expect('Midden in rechthoek → binnen', pointInPolygon(52.5, 4.5, rect));
expect('Buiten rechthoek → niet binnen', !pointInPolygon(51.0, 4.5, rect));
expect('Ver buiten rechthoek → niet binnen', !pointInPolygon(51.0, 6.0, rect));

// ── Set-stadsaantallen — snapshot-borging ────────────────────
// Deze aantallen mogen nooit stilletjes veranderen. Als je een stad toevoegt
// of verwijdert uit een set, update dan dit getal expliciet en bewust.

section('Set-stadsaantallen — regressie-snapshot');

const SET_SNAPSHOTS = {
  61: 14,  // Overijssel
  62: 10,  // Zeeland
  63: 22,  // Groningen en Drenthe
  64: 14,  // Flevoland en Utrecht
  65: 26,  // Noord-Brabant en Limburg
  66: 16,  // Zuid-Holland
  67: 15,  // Noord-Holland
};

Object.entries(SET_SNAPSHOTS).forEach(([num, expected]) => {
  const count = ALL_CITIES.filter(c => c.sets.includes(Number(num))).length;
  expect(
    `Set ${num} (${SETS[num]?.name}) heeft precies ${expected} steden`,
    count === expected,
    `heeft er ${count}`
  );
});

// Set 54: altijd gelijk aan ALL_PROVINCES (provincies-quiz)
expect(
  'Set 54: activeCities-pool = aantal provincies (12)',
  ALL_PROVINCES.length === 12
);

// Set 57: NL-wateren (zonder sets-veld)
const nlWaters = ALL_WATERS.filter(w => !w.sets);
expect(
  'Set 57: NL-waterenpool heeft precies 16 wateren',
  nlWaters.length === 16,
  `heeft er ${nlWaters.length}`
);

// ── ALL_COUNTRIES — stap 3 (country quizType) ────────────────
// Deze tests zijn bewust ROOD totdat stap 3 is geïmplementeerd.

section('ALL_COUNTRIES — structuur');

expect('ALL_COUNTRIES is gedefinieerd', typeof ALL_COUNTRIES !== 'undefined' && Array.isArray(ALL_COUNTRIES),
  'ALL_COUNTRIES bestaat nog niet');

if (typeof ALL_COUNTRIES !== 'undefined' && Array.isArray(ALL_COUNTRIES)) {
  const countryMissingFields = ALL_COUNTRIES.filter(c => !c.name || c.lat == null || c.lon == null || !Array.isArray(c.sets));
  expect('Elk land heeft name, lat, lon, sets', countryMissingFields.length === 0,
    countryMissingFields.map(c => c.name || '(naamloos)').join(', '));

  const BALTISCHE_LANDEN = ['Estland', 'Letland', 'Litouwen', 'Finland'];
  BALTISCHE_LANDEN.forEach(naam => {
    const land = ALL_COUNTRIES.find(c => c.name === naam);
    expect(`${naam} aanwezig in ALL_COUNTRIES`, !!land);
    expect(`${naam} zit in set 70`, land?.sets?.includes(70));
  });

  const count70 = ALL_COUNTRIES.filter(c => c.sets.includes(70)).length;
  expect('Set 70 heeft precies 4 landen (min. 4 voor MC-modus)', count70 === 4, `heeft er ${count70}`);
}

section('Set 70 — phases (stap 4)');

expect('Set 70 heeft een phases array', Array.isArray(SETS[70]?.phases),
  'phases ontbreekt nog');

if (Array.isArray(SETS[70]?.phases)) {
  expect('Set 70 fase 0: countries', SETS[70].phases[0]?.quizType === 'country',
    `fase 0 quizType: ${SETS[70].phases[0]?.quizType}`);
  expect('Set 70 fase 0 label: Landen', SETS[70].phases[0]?.label === 'Landen',
    `fase 0 label: ${SETS[70].phases[0]?.label}`);
  expect('Set 70 fase 0 id: countries', SETS[70].phases[0]?.id === 'countries');

  expect('Set 70 fase 1: place (hoofdsteden)', SETS[70].phases[1]?.quizType === 'place',
    `fase 1 quizType: ${SETS[70].phases[1]?.quizType}`);
  expect('Set 70 fase 1 label: Hoofdsteden', SETS[70].phases[1]?.label === 'Hoofdsteden',
    `fase 1 label: ${SETS[70].phases[1]?.label}`);
  expect('Set 70 fase 1 id: capitals', SETS[70].phases[1]?.id === 'capitals');

  expect('Set 70 heeft mastery 1 (pilot)', SETS[70].mastery === 1,
    `mastery: ${SETS[70].mastery}`);
}

section('Set 70 — hoofdsteden (stap 4)');

const BALTISCHE_HOOFDSTEDEN = ['Tallinn', 'Riga', 'Vilnius', 'Helsinki'];
BALTISCHE_HOOFDSTEDEN.forEach(naam => {
  const city = ALL_CITIES.find(c => c.name === naam);
  expect(`${naam} aanwezig in ALL_CITIES`, !!city);
  expect(`${naam} zit in set 70`, city?.sets?.includes(70));
});

const count70cities = ALL_CITIES.filter(c => c.sets.includes(70)).length;
expect('Set 70 heeft precies 4 steden (hoofdsteden + Helsinki voor MC-modus)', count70cities === 4,
  `heeft er ${count70cities}`);

// ── Set 70 — fase 3: wateren (stap 5) ────────────────────────

section('Set 70 — fase 3 wateren (stap 5)');

expect('Set 70 heeft 3 fases', SETS[70]?.phases?.length === 3,
  `heeft er ${SETS[70]?.phases?.length}`);

if (SETS[70]?.phases?.length >= 3) {
  expect('Set 70 fase 2 id: waters',    SETS[70].phases[2].id === 'waters');
  expect('Set 70 fase 2 label: Zeeën',  SETS[70].phases[2].label === 'Zeeën',
    `label: ${SETS[70].phases[2].label}`);
  expect('Set 70 fase 2 quizType: water', SETS[70].phases[2].quizType === 'water',
    `quizType: ${SETS[70].phases[2].quizType}`);
}

section('Set 70 — Baltische wateren (stap 5)');

const BALTISCHE_WATEREN = ['Oostzee', 'Finse Golf', 'Rigabocht', 'Daugava'];
BALTISCHE_WATEREN.forEach(naam => {
  const water = ALL_WATERS.find(w => w.name === naam);
  expect(`${naam} aanwezig in ALL_WATERS`, !!water);
  expect(`${naam} zit in set 70`, water?.sets?.includes(70));
});

const count70waters = ALL_WATERS.filter(w => w.sets?.includes(70)).length;
expect('Set 70 heeft precies 4 wateren', count70waters === 4,
  `heeft er ${count70waters}`);

// ── Samenvatting ──────────────────────────────────────────────

console.log(`\n${'─'.repeat(44)}`);
if (failed === 0) {
  console.log(`✅ ${passed} tests geslaagd`);
} else {
  console.log(`❌ ${failed} test(s) mislukt, ${passed} geslaagd`);
  process.exit(1);
}
