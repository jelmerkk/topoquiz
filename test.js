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
// buiten Nederland liggen — bijv. hoofdsteden in set 7.1.
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

// Binnen één set mogen stadsnamen niet dubbel voorkomen; tussen sets wel
// (bijv. 'Bergen' = Mons/BE in set 72 vs Bergen/NO in set 78).
const perSetDupes = [];
for (const setNum of Object.keys(SETS)) {
  const citiesInSet = ALL_CITIES.filter(c => c.sets?.includes(Number(setNum)));
  const names = citiesInSet.map(c => c.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length) perSetDupes.push(`set ${setNum}: ${dupes.join(',')}`);
}
expect('Geen dubbele stadsnamen binnen een set', perSetDupes.length === 0, perSetDupes.join(' | '));

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

// Alleen NL provinciehoofdsteden (set 55) — EU-hoofdsteden hebben ook capital:true maar andere sets
const capitals = ALL_CITIES.filter(c => c.capital && c.sets.includes(55));
expect('Er zijn precies 12 provinciehoofdsteden (set 55)', capitals.length === 12,
  `gevonden: ${capitals.length}`);

section('ALL_PROVINCES');

const nlProvinces = ALL_PROVINCES.filter(p => p.sets?.includes(54));
expect('Er zijn precies 12 NL-provincies (set 54)', nlProvinces.length === 12,
  `gevonden: ${nlProvinces.length}`);

const provMissingFields = ALL_PROVINCES.filter(p => !p.name || p.lat == null || p.lon == null);
expect('Elke provincie heeft name, lat, lon', provMissingFields.length === 0,
  provMissingFields.map(p => p.name || '(naamloos)').join(', '));

// NL-provincies (set 54) moeten binnen Nederland liggen; set-specifiek mag buiten
const provOutOfBounds = nlProvinces.filter(p =>
  p.lat < NL_LAT[0] || p.lat > NL_LAT[1] || p.lon < NL_LON[0] || p.lon > NL_LON[1]
);
expect('NL-provinciecoördinaten liggen binnen Nederland', provOutOfBounds.length === 0,
  provOutOfBounds.map(p => `${p.name} (${p.lat}, ${p.lon})`).join(', '));

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
const largestCity = ALL_CITIES.reduce((a, b) => b.pop > a.pop ? b : a);
expect('grootste stad heeft de grootste straal',
  cityRadius(largestCity) === maxR, `grootste: ${largestCity.name} (${largestCity.pop})`);

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

section('clickResult() — EU-set (set 73, clickCorrectKm: 80, clickCloseKm: 240)');

// Set 73 heeft expliciete EU-drempels die fitOnStart overriden
expect('set 73: 0 km → correct',    clickResult(0,   73) === 'correct');
expect('set 73: 50 km → correct',   clickResult(50,  73) === 'correct');
expect('set 73: 79 km → correct',   clickResult(79,  73) === 'correct');
expect('set 73: 80 km → close',     clickResult(80,  73) === 'close');
expect('set 73: 150 km → close',    clickResult(150, 73) === 'close');
expect('set 73: 239 km → close',    clickResult(239, 73) === 'close');
expect('set 73: 240 km → wrong',    clickResult(240, 73) === 'wrong');
expect('set 73: 400 km → wrong',    clickResult(400, 73) === 'wrong');

section('Bounds-constanten');

expect('NL_BOUNDS is gedefinieerd',    Array.isArray(NL_BOUNDS) && NL_BOUNDS.length === 2);
expect('EU_BOUNDS is gedefinieerd',    Array.isArray(EU_BOUNDS) && EU_BOUNDS.length === 2);
expect('WORLD_BOUNDS is gedefinieerd', Array.isArray(WORLD_BOUNDS) && WORLD_BOUNDS.length === 2);

// ── ALL_WATERS ────────────────────────────────────────────────

section('ALL_WATERS — structuur');

expect('ALL_WATERS is gedefinieerd', Array.isArray(ALL_WATERS));

const waterMissingFields = ALL_WATERS.filter(w => !w.name || w.lat == null || w.lon == null);
expect('Elk water heeft name, lat, lon', waterMissingFields.length === 0,
  waterMissingFields.map(w => w.name || '(naamloos)').join(', '));

// Alleen NL-wateren (set 57) moeten binnen Nederland liggen
const waterOutOfBounds = ALL_WATERS.filter(w => {
  if (!w.sets?.includes(57)) return false; // niet-NL wateren mogen buiten NL liggen
  return w.lat < NL_LAT[0] || w.lat > NL_LAT[1] || w.lon < NL_LON[0] || w.lon > NL_LON[1];
});
expect('NL-watercoördinaten liggen binnen Nederland', waterOutOfBounds.length === 0,
  waterOutOfBounds.map(w => `${w.name} (${w.lat}, ${w.lon})`).join(', '));

// Dubbele namen zijn OK als ze verschillende sets hebben (bijv. NL Maas vs Belgische Maas)
const waterDuplicates = ALL_WATERS.filter((w, i) =>
  ALL_WATERS.findIndex(x => x.name === w.name && JSON.stringify(x.sets) === JSON.stringify(w.sets)) !== i
);
expect('Geen échte dubbele waternamen (zelfde naam + zelfde sets)', waterDuplicates.length === 0,
  waterDuplicates.map(w => w.name).join(', '));

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

// Set 54: provincies-quiz — 12 NL-provincies
expect(
  'Set 54: activeCities-pool = 12 NL-provincies',
  ALL_PROVINCES.filter(p => p.sets?.includes(54)).length === 12
);

// Set 57: NL-wateren (sets:[57])
const nlWaters = ALL_WATERS.filter(w => w.sets?.includes(57));
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

}

// ── Set 71 — Landen van Europa (issue #40) ───────────────────

section('Set 71 — Landen van Europa');

const SET71_LANDEN = [
  'Portugal','Spanje','Frankrijk','België','Nederland','Luxemburg',
  'Verenigd Koninkrijk','Ierland','IJsland','Duitsland','Denemarken',
  'Noorwegen','Zweden','Finland','Oostenrijk','Zwitserland',
  'Italië','Polen','Tsjechië','Hongarije',
];
const SET71_HOOFDSTEDEN = [
  'Lissabon','Madrid','Parijs','Brussel','Amsterdam','Luxemburg',
  'Londen','Dublin','Reykjavík','Berlijn','Kopenhagen',
  'Oslo','Stockholm','Helsinki','Wenen','Bern',
  'Rome','Warschau','Praag','Boedapest',
];

expect('Set 71 bestaat in SETS',        !!SETS[71]);
expect('Set 71 is groep 7',             SETS[71]?.group === 7);
expect('Set 71 heeft 2 fases',          SETS[71]?.phases?.length === 2);
expect('Set 71 fase 1 is country',      SETS[71]?.phases?.[0]?.quizType === 'country');
expect('Set 71 fase 2 is place',        SETS[71]?.phases?.[1]?.quizType === 'place');
expect('Set 71 heeft bounds',           Array.isArray(SETS[71]?.bounds));
expect('Set 71 clickCorrectKm = 100',   SETS[71]?.clickCorrectKm === 100);

const landen71 = ALL_COUNTRIES.filter(c => c.sets?.includes(71));
expect('Set 71 heeft 20 landen', landen71.length === 20,
  `heeft er ${landen71.length}`);

SET71_LANDEN.forEach(naam => {
  const land = ALL_COUNTRIES.find(c => c.name === naam && c.sets?.includes(71));
  expect(`${naam} in ALL_COUNTRIES (set 71)`, !!land);
});

const steden71 = ALL_CITIES.filter(c => c.sets?.includes(71));
expect('Set 71 heeft 20 steden', steden71.length === 20,
  `heeft er ${steden71.length}`);

SET71_HOOFDSTEDEN.forEach(naam => {
  const stad = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(71));
  expect(`${naam} in ALL_CITIES (set 71)`, !!stad);
});

// ── Set 72 — België en Luxemburg (issue #41) ─────────────────

section('Set 72 — België en Luxemburg');

const SET72_STEDEN = [
  'Antwerpen','Gent','Brugge','Brussel','Luik','Namen','Charleroi',
  'Bergen','Mechelen','Leuven','Hasselt','Bastogne','Oostende','Luxemburg',
];
const SET72_GEWESTEN = ['Vlaanderen','Wallonië','Brussels Hoofdstedelijk Gewest'];

expect('Set 72 bestaat in SETS',        !!SETS[72]);
expect('Set 72 is groep 7',             SETS[72]?.group === 7);
expect('Set 72 heeft 3 fases',          SETS[72]?.phases?.length === 3);
expect('Set 72 fase 1 is province',     SETS[72]?.phases?.[0]?.quizType === 'province');
expect('Set 72 fase 2 is place',        SETS[72]?.phases?.[1]?.quizType === 'place');
expect('Set 72 fase 3 is water',        SETS[72]?.phases?.[2]?.quizType === 'water');
expect('Set 72 heeft bounds',           Array.isArray(SETS[72]?.bounds));

// Gewesten (3 Belgische + Luxemburg = 4 items in province-fase)
SET72_GEWESTEN.forEach(naam => {
  const g = ALL_PROVINCES.find(p => p.name === naam);
  expect(`${naam} in ALL_PROVINCES`, !!g);
  expect(`${naam} heeft sets:[72]`, g?.sets?.includes(72));
});
expect('Luxemburg in ALL_PROVINCES (set 72)', !!ALL_PROVINCES.find(p => p.name === 'Luxemburg' && p.sets?.includes(72)));
expect('Set 72 heeft 4 gewesten (3 + Luxemburg)', ALL_PROVINCES.filter(p => p.sets?.includes(72)).length === 4);

// Steden
SET72_STEDEN.forEach(naam => {
  const s = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(72));
  expect(`${naam} in ALL_CITIES (set 72)`, !!s);
});
expect('Set 72 heeft 14 steden', ALL_CITIES.filter(c => c.sets?.includes(72)).length === 14);

// Wateren
['Schelde','Maas'].forEach(naam => {
  const w72 = ALL_WATERS.find(w => w.name === naam && w.sets?.includes(72));
  expect(`${naam} in ALL_WATERS (set 72)`, !!w72);
});

// ── Set 74 — Duitsland (issue #43) ───────────────────────────

section('Set 74 — Duitsland');

const SET74_STEDEN = [
  'Berlijn','Hamburg','Bremen','Hannover','Magdeburg','Dortmund','Essen',
  'Düsseldorf','Keulen','Bonn','Aken','Duisburg','Frankfurt','Stuttgart',
  'München','Neurenberg','Leipzig','Dresden',
];
const SET74_REGIOS = ['Ruhrgebied','Beieren','Sauerland','Eifel','Zwarte Woud','Harz'];
const SET74_RIVIEREN = ['Rijn','Elbe','Moezel'];

expect('Set 74 bestaat in SETS',        !!SETS[74]);
expect('Set 74 is groep 7',             SETS[74]?.group === 7);
expect('Set 74 heeft 3 fases',          SETS[74]?.phases?.length === 3);
expect('Set 74 fase 1 is place',        SETS[74]?.phases?.[0]?.quizType === 'place');
expect('Set 74 fase 2 is province',     SETS[74]?.phases?.[1]?.quizType === 'province');
expect('Set 74 fase 3 is water',        SETS[74]?.phases?.[2]?.quizType === 'water');
expect('Set 74 heeft bounds',           Array.isArray(SETS[74]?.bounds));
expect('Set 74 heeft EU-klikdrempels',  SETS[74]?.clickCorrectKm === 60 && SETS[74]?.clickCloseKm === 180);

// Steden (18: Berlijn uit set 71 aangevuld met [74] + 17 nieuwe)
SET74_STEDEN.forEach(naam => {
  const s = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(74));
  expect(`${naam} in ALL_CITIES (set 74)`, !!s);
});
expect('Set 74 heeft 18 steden', ALL_CITIES.filter(c => c.sets?.includes(74)).length === 18);

// Regio's (6 totaal: 5 fuzzy ellipsen + Beieren als harde polygoon uit OSM, #81)
SET74_REGIOS.forEach(naam => {
  const r = ALL_PROVINCES.find(p => p.name === naam && p.sets?.includes(74));
  expect(`${naam} in ALL_PROVINCES (set 74)`, !!r);
  if (naam === 'Beieren') {
    expect(`${naam} is hard polygoon (niet fuzzy)`, r?.shape !== 'fuzzy');
  } else {
    expect(`${naam} is fuzzy`, r?.shape === 'fuzzy');
  }
});
expect('Set 74 heeft 6 regio\'s', ALL_PROVINCES.filter(p => p.sets?.includes(74)).length === 6);
expect('Beieren polygoon staat in gewesten.geojson', (() => {
  try {
    const fs = require('fs');
    const gj = JSON.parse(fs.readFileSync('gewesten.geojson','utf8'));
    const f = gj.features.find(x => x.properties.name === 'Beieren');
    return f && f.geometry.type === 'Polygon' && f.geometry.coordinates[0].length > 100;
  } catch { return false; }
})());

// Rivieren (3: Rijn gedeeld met set 57, Elbe + Moezel nieuw)
SET74_RIVIEREN.forEach(naam => {
  const w = ALL_WATERS.find(x => x.name === naam && x.sets?.includes(74));
  expect(`${naam} in ALL_WATERS (set 74)`, !!w);
});
expect('Rijn ook in set 57', ALL_WATERS.find(w => w.name === 'Rijn')?.sets?.includes(57));
expect('Set 74 heeft 3 rivieren', ALL_WATERS.filter(w => w.sets?.includes(74)).length === 3);

// clickResult met set 74 drempels
expect('set 74: 59 km → correct', clickResult(59, 74) === 'correct');
expect('set 74: 60 km → close',   clickResult(60, 74) === 'close');
expect('set 74: 179 km → close',  clickResult(179, 74) === 'close');
expect('set 74: 180 km → wrong',  clickResult(180, 74) === 'wrong');

// ── Set 75 — VK en Ierland (issue #44) ───────────────────────

section('Set 75 — VK en Ierland');

const SET75_STEDEN = [
  'Londen','Birmingham','Manchester','Liverpool','Leeds','Sheffield',
  'Newcastle','Cardiff','Edinburgh','Glasgow','Aberdeen','Belfast','Dublin',
];
const SET75_REGIOS = ['Engeland','Schotland','Wales','Noord-Ierland','Ierland'];
const SET75_WATEREN = ['Theems','Het Kanaal','Ierse Zee'];

expect('Set 75 bestaat in SETS',        !!SETS[75]);
expect('Set 75 is groep 7',             SETS[75]?.group === 7);
expect('Set 75 heeft 3 fases',          SETS[75]?.phases?.length === 3);
expect('Set 75 fase 1 is province',     SETS[75]?.phases?.[0]?.quizType === 'province');
expect('Set 75 fase 2 is place',        SETS[75]?.phases?.[1]?.quizType === 'place');
expect('Set 75 fase 3 is water',        SETS[75]?.phases?.[2]?.quizType === 'water');
expect('Set 75 heeft bounds',           Array.isArray(SETS[75]?.bounds));
expect('Set 75 heeft EU-klikdrempels',  SETS[75]?.clickCorrectKm === 60 && SETS[75]?.clickCloseKm === 180);

// Steden (13)
SET75_STEDEN.forEach(naam => {
  const s = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(75));
  expect(`${naam} in ALL_CITIES (set 75)`, !!s);
});
expect('Set 75 heeft 13 steden', ALL_CITIES.filter(c => c.sets?.includes(75)).length === 13);

// Regio's (5 harde polygonen — géén fuzzy, anders dan set 74)
SET75_REGIOS.forEach(naam => {
  const r = ALL_PROVINCES.find(p => p.name === naam && p.sets?.includes(75));
  expect(`${naam} in ALL_PROVINCES (set 75)`, !!r);
  expect(`${naam} is géén fuzzy ellips`, r && r.shape !== 'fuzzy');
});
expect('Set 75 heeft 5 regio\'s', ALL_PROVINCES.filter(p => p.sets?.includes(75)).length === 5);

// Wateren (3: Theems nieuw, Het Kanaal gedeeld met set 73, Ierse Zee nieuw)
SET75_WATEREN.forEach(naam => {
  const w = ALL_WATERS.find(x => x.name === naam && x.sets?.includes(75));
  expect(`${naam} in ALL_WATERS (set 75)`, !!w);
});
expect('Het Kanaal ook in set 73', ALL_WATERS.find(w => w.name === 'Het Kanaal')?.sets?.includes(73));
expect('Set 75 heeft 3 wateren', ALL_WATERS.filter(w => w.sets?.includes(75)).length === 3);

// clickResult met set 75 drempels (60/180, identiek aan set 74)
expect('set 75: 59 km → correct', clickResult(59, 75) === 'correct');
expect('set 75: 60 km → close',   clickResult(60, 75) === 'close');
expect('set 75: 179 km → close',  clickResult(179, 75) === 'close');
expect('set 75: 180 km → wrong',  clickResult(180, 75) === 'wrong');

// ── Set 76 — Midden-Europa en Italië (issue #45) ────────────

section('Set 76 — Midden-Europa en Italië');

const SET76_STEDEN = [
  // Zwitserland
  'Bern','Zürich','Genève','Basel',
  // Liechtenstein (microstaat als punt)
  'Liechtenstein',
  // Oostenrijk
  'Wenen','Salzburg','Innsbruck','Graz','Klagenfurt',
  // Tsjechië
  'Praag','Brno',
  // Hongarije
  'Boedapest',
  // Italië
  'Rome','Milaan','Napels','Venetië','Genua','Turijn','Florence',
  // Microstaten
  'San Marino','Malta',
];
const SET76_GEBIEDEN = ['Alpen','Apennijnen','Sicilië','Sardinië'];
const SET76_WATEREN = ['Donau','Po','Meer van Genève','Balaton','Adriatische Zee'];

expect('Set 76 bestaat in SETS',        !!SETS[76]);
expect('Set 76 is groep 7',             SETS[76]?.group === 7);
expect('Set 76 heeft 3 fases',          SETS[76]?.phases?.length === 3);
expect('Set 76 fase 1 is place',        SETS[76]?.phases?.[0]?.quizType === 'place');
expect('Set 76 fase 2 is province',     SETS[76]?.phases?.[1]?.quizType === 'province');
expect('Set 76 fase 3 is water',        SETS[76]?.phases?.[2]?.quizType === 'water');
expect('Set 76 heeft bounds',           Array.isArray(SETS[76]?.bounds));
expect('Set 76 heeft EU-klikdrempels',  SETS[76]?.clickCorrectKm === 60 && SETS[76]?.clickCloseKm === 180);

// Steden (22: 5 bestaand uit set 71 + 17 nieuw)
SET76_STEDEN.forEach(naam => {
  const s = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(76));
  expect(`${naam} in ALL_CITIES (set 76)`, !!s);
});
expect('Set 76 heeft 22 steden', ALL_CITIES.filter(c => c.sets?.includes(76)).length === 22);

// Gebieden (4: Alpen, Apennijnen, Sicilië, Sardinië)
SET76_GEBIEDEN.forEach(naam => {
  const r = ALL_PROVINCES.find(p => p.name === naam && p.sets?.includes(76));
  expect(`${naam} in ALL_PROVINCES (set 76)`, !!r);
});
expect('Set 76 heeft 4 gebieden', ALL_PROVINCES.filter(p => p.sets?.includes(76)).length === 4);

// Apennijnen-ellipse volgt de NW-SE-diagonaal van de bergrug. Centrum op de spine,
// rot > 0 (lange as gekanteld), en beide uiteinden in de juiste hoeken van de laars.
const apennijnen = ALL_PROVINCES.find(p => p.name === 'Apennijnen' && p.sets?.includes(76));
expect('Apennijnen centrum lon tussen 13.0 en 14.0', apennijnen && apennijnen.lon >= 13.0 && apennijnen.lon <= 14.0);
expect('Apennijnen centrum lat tussen 41.5 en 42.5', apennijnen && apennijnen.lat >= 41.5 && apennijnen.lat <= 42.5);
expect('Apennijnen heeft rotatie > 15° (NW-SE gekanteld)', apennijnen && apennijnen.rot >= 15);

// Wateren (5: Donau, Po, Meer van Genève, Balaton, Adriatische Zee)
SET76_WATEREN.forEach(naam => {
  const w = ALL_WATERS.find(x => x.name === naam && x.sets?.includes(76));
  expect(`${naam} in ALL_WATERS (set 76)`, !!w);
});
expect('Set 76 heeft 5 wateren', ALL_WATERS.filter(w => w.sets?.includes(76)).length === 5);

// clickResult met set 76 drempels (60/180)
expect('set 76: 59 km → correct', clickResult(59, 76) === 'correct');
expect('set 76: 60 km → close',   clickResult(60, 76) === 'close');
expect('set 76: 179 km → close',  clickResult(179, 76) === 'close');
expect('set 76: 180 km → wrong',  clickResult(180, 76) === 'wrong');

// ── Set 58 — Onze buren (Geobas 5, hoofdstuk 8) ─────────────

section('Set 58 — Onze buren');

const SET58_LANDEN = [
  'België','Luxemburg','Duitsland','Frankrijk','Verenigd Koninkrijk',
  'Ierland','Denemarken','Noorwegen','Zweden','Polen','Tsjechië',
  'Oostenrijk','Zwitserland','Slovenië','Italië','Spanje',
];
const SET58_HOOFDSTEDEN = [
  'Londen','Brussel','Parijs','Berlijn','Kopenhagen',
];

expect('Set 58 bestaat in SETS',        !!SETS[58]);
expect('Set 58 is groep 5',             SETS[58]?.group === 5);
expect('Set 58 heeft 2 fases',          SETS[58]?.phases?.length === 2);
expect('Set 58 fase 1 is country',      SETS[58]?.phases?.[0]?.quizType === 'country');
expect('Set 58 fase 2 is place',        SETS[58]?.phases?.[1]?.quizType === 'place');
expect('Set 58 heeft bounds',           Array.isArray(SETS[58]?.bounds));
expect('Set 58 heeft EU-klikdrempels',  SETS[58]?.clickCorrectKm === 100 && SETS[58]?.clickCloseKm === 300);

// Landen (16: 15 bestaand + Slovenië nieuw)
SET58_LANDEN.forEach(naam => {
  const c = ALL_COUNTRIES.find(x => x.name === naam && x.sets?.includes(58));
  expect(`${naam} in ALL_COUNTRIES (set 58)`, !!c);
});
expect('Set 58 heeft 16 landen', ALL_COUNTRIES.filter(c => c.sets?.includes(58)).length === 16);

// Hoofdsteden (5 buitenlandse hoofdsteden)
SET58_HOOFDSTEDEN.forEach(naam => {
  const s = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(58));
  expect(`${naam} in ALL_CITIES (set 58)`, !!s);
});
expect('Set 58 heeft 5 hoofdsteden', ALL_CITIES.filter(c => c.sets?.includes(58)).length === 5);

// clickResult met set 58 drempels (100/300)
expect('set 58: 99 km → correct', clickResult(99, 58) === 'correct');
expect('set 58: 100 km → close',  clickResult(100, 58) === 'close');
expect('set 58: 299 km → close',  clickResult(299, 58) === 'close');
expect('set 58: 300 km → wrong',  clickResult(300, 58) === 'wrong');

// ── Set 77 — Oost-Europa (issue #46) ────────────────────────

section('Set 77 — Oost-Europa');

const SET77_LANDEN = [
  // Nieuwe landen voor 7.7
  'Slowakije','Oekraïne','Moldavië','Roemenië','Bulgarije',
  'Wit-Rusland','Rusland','Estland','Letland','Litouwen',
  // Herhaald uit 7.1
  'Polen','Tsjechië','Hongarije',
];
const SET77_STEDEN = [
  // Herhaald uit 7.1
  'Warschau',
  // Nieuw voor 7.7
  'Krakau','Boekarest','Sofia','Kiev','Odessa','Minsk','Moskou','Sint-Petersburg',
];
const SET77_GEBERGTEN = ['Karpaten','Balkan','Kaukasus'];
const SET77_WATEREN = ['Donau','Oder','Weichsel','Dnjepr','Oostzee','Zwarte Zee'];

expect('Set 77 bestaat in SETS',        !!SETS[77]);
expect('Set 77 is groep 7',             SETS[77]?.group === 7);
expect('Set 77 heeft 4 fases',          SETS[77]?.phases?.length === 4);
expect('Set 77 fase 1 is country',      SETS[77]?.phases?.[0]?.quizType === 'country');
expect('Set 77 fase 2 is place',        SETS[77]?.phases?.[1]?.quizType === 'place');
expect('Set 77 fase 3 is province',     SETS[77]?.phases?.[2]?.quizType === 'province');
expect('Set 77 fase 4 is water',        SETS[77]?.phases?.[3]?.quizType === 'water');
expect('Set 77 heeft bounds',           Array.isArray(SETS[77]?.bounds));
expect('Set 77 heeft EU-klikdrempels',  SETS[77]?.clickCorrectKm === 100 && SETS[77]?.clickCloseKm === 300);

// Landen (13: 10 nieuw + 3 herhaald uit 7.1)
SET77_LANDEN.forEach(naam => {
  const c = ALL_COUNTRIES.find(x => x.name === naam && x.sets?.includes(77));
  expect(`${naam} in ALL_COUNTRIES (set 77)`, !!c);
});
expect('Set 77 heeft 13 landen', ALL_COUNTRIES.filter(c => c.sets?.includes(77)).length === 13);

// Steden (9: 1 herhaald + 8 nieuw)
SET77_STEDEN.forEach(naam => {
  const s = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(77));
  expect(`${naam} in ALL_CITIES (set 77)`, !!s);
});
expect('Set 77 heeft 9 steden', ALL_CITIES.filter(c => c.sets?.includes(77)).length === 9);

// Gebergten (3: Karpaten, Balkan, Kaukasus — fuzzy ellipsen)
SET77_GEBERGTEN.forEach(naam => {
  const r = ALL_PROVINCES.find(p => p.name === naam && p.sets?.includes(77));
  expect(`${naam} in ALL_PROVINCES (set 77)`, !!r);
  expect(`${naam} is fuzzy`, r?.shape === 'fuzzy');
});
expect('Set 77 heeft 3 gebergten', ALL_PROVINCES.filter(p => p.sets?.includes(77)).length === 3);

// Wateren (6: Donau herhaald + 5 nieuw)
SET77_WATEREN.forEach(naam => {
  const w = ALL_WATERS.find(x => x.name === naam && x.sets?.includes(77));
  expect(`${naam} in ALL_WATERS (set 77)`, !!w);
});
expect('Set 77 heeft 6 wateren', ALL_WATERS.filter(w => w.sets?.includes(77)).length === 6);

// clickResult met set 77 drempels (100/300 — grote afstanden voor Oost-Europa)
expect('set 77: 99 km → correct', clickResult(99, 77) === 'correct');
expect('set 77: 100 km → close',  clickResult(100, 77) === 'close');
expect('set 77: 299 km → close',  clickResult(299, 77) === 'close');
expect('set 77: 300 km → wrong',  clickResult(300, 77) === 'wrong');

// ── Set 78 — Noord-Europa (issue #47) ────────────────────────

section('Set 78 — Noord-Europa');

const SET78_LANDEN = ['Noorwegen','Zweden','Finland','Denemarken'];
const SET78_STEDEN = [
  // Hergebruik uit 7.1
  'Oslo','Stockholm','Helsinki','Kopenhagen',
  // Nieuw voor 7.8
  'Bergen','Trondheim','Narvik','Hammerfest','Göteborg','Malmö','Kiruna',
];
const SET78_GEBIEDEN = ['Lapland','Jutland'];
const SET78_WATEREN = ['Sont','Botnische Golf','Finse Golf','Barentszzee','Atlantische Oceaan','Oostzee'];

expect('Set 78 bestaat in SETS',        !!SETS[78]);
expect('Set 78 is groep 7',             SETS[78]?.group === 7);
expect('Set 78 heeft 4 fases',          SETS[78]?.phases?.length === 4);
expect('Set 78 fase 1 is country',      SETS[78]?.phases?.[0]?.quizType === 'country');
expect('Set 78 fase 2 is place',        SETS[78]?.phases?.[1]?.quizType === 'place');
expect('Set 78 fase 3 is province',     SETS[78]?.phases?.[2]?.quizType === 'province');
expect('Set 78 fase 4 is water',        SETS[78]?.phases?.[3]?.quizType === 'water');
expect('Set 78 heeft bounds',           Array.isArray(SETS[78]?.bounds));
expect('Set 78 heeft EU-klikdrempels',  SETS[78]?.clickCorrectKm === 100 && SETS[78]?.clickCloseKm === 300);

SET78_LANDEN.forEach(naam => {
  const c = ALL_COUNTRIES.find(x => x.name === naam && x.sets?.includes(78));
  expect(`${naam} in ALL_COUNTRIES (set 78)`, !!c);
});
expect('Set 78 heeft 4 landen', ALL_COUNTRIES.filter(c => c.sets?.includes(78)).length === 4);

SET78_STEDEN.forEach(naam => {
  const s = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(78));
  expect(`${naam} in ALL_CITIES (set 78)`, !!s);
});
expect('Set 78 heeft 11 steden', ALL_CITIES.filter(c => c.sets?.includes(78)).length === 11);

SET78_GEBIEDEN.forEach(naam => {
  const r = ALL_PROVINCES.find(p => p.name === naam && p.sets?.includes(78));
  expect(`${naam} in ALL_PROVINCES (set 78)`, !!r);
  expect(`${naam} is fuzzy`, r?.shape === 'fuzzy');
});
expect('Set 78 heeft 2 gebieden', ALL_PROVINCES.filter(p => p.sets?.includes(78)).length === 2);

SET78_WATEREN.forEach(naam => {
  const w = ALL_WATERS.find(x => x.name === naam && x.sets?.includes(78));
  expect(`${naam} in ALL_WATERS (set 78)`, !!w);
});
expect('Set 78 heeft 6 wateren', ALL_WATERS.filter(w => w.sets?.includes(78)).length === 6);

// ── Set 79 — Zuidoost-Europa (issue #48) ─────────────────────

section('Set 79 — Zuidoost-Europa');

const SET79_LANDEN = [
  // Hergebruik
  'Slovenië','Roemenië','Bulgarije','Slowakije',
  // Nieuw voor 7.9
  'Kroatië','Bosnië-Hercegovina','Servië','Montenegro','Albanië',
  'Noord-Macedonië','Griekenland','Turkije','Cyprus',
];
const SET79_STEDEN = [
  // Hergebruik uit 7.7
  'Boekarest','Sofia',
  // Nieuw voor 7.9
  'Ljubljana','Zagreb','Split','Sarajevo','Belgrado','Podgorica','Tirana',
  'Skopje','Athene','Thessaloniki','Bratislava','Istanbul','Ankara',
];
const SET79_GEBIEDEN = ['Kreta'];
const SET79_WATEREN = ['Zwarte Zee','Bosporus'];

expect('Set 79 bestaat in SETS',        !!SETS[79]);
expect('Set 79 is groep 7',             SETS[79]?.group === 7);
expect('Set 79 heeft 4 fases',          SETS[79]?.phases?.length === 4);
expect('Set 79 fase 1 is country',      SETS[79]?.phases?.[0]?.quizType === 'country');
expect('Set 79 fase 2 is place',        SETS[79]?.phases?.[1]?.quizType === 'place');
expect('Set 79 fase 3 is province',     SETS[79]?.phases?.[2]?.quizType === 'province');
expect('Set 79 fase 4 is water',        SETS[79]?.phases?.[3]?.quizType === 'water');
expect('Set 79 heeft bounds',           Array.isArray(SETS[79]?.bounds));
expect('Set 79 heeft EU-klikdrempels',  SETS[79]?.clickCorrectKm === 100 && SETS[79]?.clickCloseKm === 300);

SET79_LANDEN.forEach(naam => {
  const c = ALL_COUNTRIES.find(x => x.name === naam && x.sets?.includes(79));
  expect(`${naam} in ALL_COUNTRIES (set 79)`, !!c);
});
expect('Set 79 heeft 13 landen', ALL_COUNTRIES.filter(c => c.sets?.includes(79)).length === 13);

SET79_STEDEN.forEach(naam => {
  const s = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(79));
  expect(`${naam} in ALL_CITIES (set 79)`, !!s);
});
expect('Set 79 heeft 15 steden', ALL_CITIES.filter(c => c.sets?.includes(79)).length === 15);

SET79_GEBIEDEN.forEach(naam => {
  const r = ALL_PROVINCES.find(p => p.name === naam && p.sets?.includes(79));
  expect(`${naam} in ALL_PROVINCES (set 79)`, !!r);
});
expect('Set 79 heeft 1 gebied (Kreta)', ALL_PROVINCES.filter(p => p.sets?.includes(79)).length === 1);

SET79_WATEREN.forEach(naam => {
  const w = ALL_WATERS.find(x => x.name === naam && x.sets?.includes(79));
  expect(`${naam} in ALL_WATERS (set 79)`, !!w);
});
expect('Set 79 heeft 2 wateren', ALL_WATERS.filter(w => w.sets?.includes(79)).length === 2);

// ── Set 81 — Zuid-Amerika (8.1) ───────────────────────────────

section('Set 81 — Zuid-Amerika');

const SET81_LANDEN = [
  'Colombia','Venezuela','Suriname','Ecuador','Peru','Bolivia',
  'Brazilië','Paraguay','Chili','Argentinië','Uruguay',
];
const SET81_STEDEN = [
  'Bogotá','Medellín','Caracas','Paramaribo','Quito','Guayaquil',
  'Lima','Cuzco','La Paz','Brasília','São Paulo','Rio de Janeiro',
  'Manaus','Salvador','Asunción','Santiago','Córdoba','Buenos Aires','Montevideo',
];
const SET81_GEBIEDEN = ['Andes','Vuurland'];
const SET81_WATEREN  = ['Amazone'];

expect('Set 81 bestaat in SETS',        !!SETS[81]);
expect('Set 81 is groep 8',             SETS[81]?.group === 8);
expect('Set 81 heeft 4 fases',          SETS[81]?.phases?.length === 4);
expect('Set 81 fase 1 is country',      SETS[81]?.phases?.[0]?.quizType === 'country');
expect('Set 81 fase 2 is place',        SETS[81]?.phases?.[1]?.quizType === 'place');
expect('Set 81 fase 3 is province',     SETS[81]?.phases?.[2]?.quizType === 'province');
expect('Set 81 fase 4 is water',        SETS[81]?.phases?.[3]?.quizType === 'water');
expect('Set 81 heeft bounds',           Array.isArray(SETS[81]?.bounds));
expect('Set 81 heeft continentale klikdrempels (≥250/700 voor continent-zoom)',
  SETS[81]?.clickCorrectKm >= 250 && SETS[81]?.clickCloseKm >= 700);

SET81_LANDEN.forEach(naam => {
  const c = ALL_COUNTRIES.find(x => x.name === naam && x.sets?.includes(81));
  expect(`${naam} in ALL_COUNTRIES (set 81)`, !!c);
});
expect('Set 81 heeft 11 landen', ALL_COUNTRIES.filter(c => c.sets?.includes(81)).length === 11);

SET81_STEDEN.forEach(naam => {
  const s = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(81));
  expect(`${naam} in ALL_CITIES (set 81)`, !!s);
});
expect('Set 81 heeft 19 steden', ALL_CITIES.filter(c => c.sets?.includes(81)).length === 19);

SET81_GEBIEDEN.forEach(naam => {
  const r = ALL_PROVINCES.find(p => p.name === naam && p.sets?.includes(81));
  expect(`${naam} in ALL_PROVINCES (set 81)`, !!r);
  expect(`${naam} is fuzzy (set 81)`, r?.shape === 'fuzzy');
  expect(`${naam} kind === 'gebied' (niet 'gewest')`, r?.kind === 'gebied');
});
expect('Set 81 heeft 2 gebieden', ALL_PROVINCES.filter(p => p.sets?.includes(81)).length === 2);

SET81_WATEREN.forEach(naam => {
  const w = ALL_WATERS.find(x => x.name === naam && x.sets?.includes(81));
  expect(`${naam} in ALL_WATERS (set 81)`, !!w);
});
expect('Set 81 heeft 1 water', ALL_WATERS.filter(w => w.sets?.includes(81)).length === 1);

// Landen-polygonen in landen-zuidamerika.geojson
{
  const fs = require('fs');
  const path = require('path');
  const gj = JSON.parse(fs.readFileSync(path.join(__dirname, 'landen-zuidamerika.geojson'), 'utf8'));
  SET81_LANDEN.forEach(naam => {
    const f = gj.features.find(x => x.properties.name === naam);
    expect(`${naam} polygoon in landen-zuidamerika.geojson`, !!f);
    expect(`${naam} sets bevat 81`, f?.properties.sets?.includes(81));
  });
}

// Amazone als LineString in wateren.geojson
{
  const fs = require('fs');
  const path = require('path');
  const gj = JSON.parse(fs.readFileSync(path.join(__dirname, 'wateren.geojson'), 'utf8'));
  const f = gj.features.find(x => x.properties.name === 'Amazone');
  expect('Amazone in wateren.geojson', !!f);
  expect('Amazone is LineString', f?.geometry.type === 'LineString');
  expect('Amazone sets bevat 81', f?.properties.sets?.includes(81));
}

// ── Set 82 — Afrika (8.2) ─────────────────────────────────────

section('Set 82 — Afrika');

const SET82_LANDEN = [
  'Marokko','Algerije','Tunesië','Egypte','Sudan','Ethiopië',
  'Kenia','Tanzania','Nigeria','Ghana','Senegal','DR Congo','Zuid-Afrika',
];
const SET82_STEDEN = [
  'Casablanca','Algiers','Tunis','Cairo','Alexandrië','Khartoem',
  'Addis Abeba','Nairobi','Dar es Salaam','Lagos','Accra','Dakar',
  'Kinshasa','Johannesburg','Kaapstad',
];
const SET82_GEBIEDEN = ['Sahara','Atlasgebergte','Canarische Eilanden'];
const SET82_WATEREN  = ['Nijl','Congo','Niger','Victoriameer','Rode Zee','Suezkanaal','Straat van Gibraltar'];

expect('Set 82 bestaat in SETS',        !!SETS[82]);
expect('Set 82 is groep 8',             SETS[82]?.group === 8);
expect('Set 82 heeft 4 fases',          SETS[82]?.phases?.length === 4);
expect('Set 82 fase 1 is country',      SETS[82]?.phases?.[0]?.quizType === 'country');
expect('Set 82 fase 2 is place',        SETS[82]?.phases?.[1]?.quizType === 'place');
expect('Set 82 fase 3 is province',     SETS[82]?.phases?.[2]?.quizType === 'province');
expect('Set 82 fase 4 is water',        SETS[82]?.phases?.[3]?.quizType === 'water');
expect('Set 82 heeft bounds',           Array.isArray(SETS[82]?.bounds));
expect('Set 82 heeft continentale klikdrempels (≥250/700)',
  SETS[82]?.clickCorrectKm >= 250 && SETS[82]?.clickCloseKm >= 700);

SET82_LANDEN.forEach(naam => {
  const c = ALL_COUNTRIES.find(x => x.name === naam && x.sets?.includes(82));
  expect(`${naam} in ALL_COUNTRIES (set 82)`, !!c);
});
expect('Set 82 heeft 13 landen', ALL_COUNTRIES.filter(c => c.sets?.includes(82)).length === 13);

SET82_STEDEN.forEach(naam => {
  const s = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(82));
  expect(`${naam} in ALL_CITIES (set 82)`, !!s);
});
expect('Set 82 heeft 15 steden', ALL_CITIES.filter(c => c.sets?.includes(82)).length === 15);

SET82_GEBIEDEN.forEach(naam => {
  const r = ALL_PROVINCES.find(p => p.name === naam && p.sets?.includes(82));
  expect(`${naam} in ALL_PROVINCES (set 82)`, !!r);
  expect(`${naam} is fuzzy (set 82)`, r?.shape === 'fuzzy');
  expect(`${naam} kind === 'gebied' (set 82)`, r?.kind === 'gebied');
});
expect('Set 82 heeft 3 gebieden', ALL_PROVINCES.filter(p => p.sets?.includes(82)).length === 3);

SET82_WATEREN.forEach(naam => {
  const w = ALL_WATERS.find(x => x.name === naam && x.sets?.includes(82));
  expect(`${naam} in ALL_WATERS (set 82)`, !!w);
});
expect('Set 82 heeft 7 wateren', ALL_WATERS.filter(w => w.sets?.includes(82)).length === 7);

// Landen-polygonen in landen-afrika.geojson
{
  const fs = require('fs');
  const path = require('path');
  const gj = JSON.parse(fs.readFileSync(path.join(__dirname, 'landen-afrika.geojson'), 'utf8'));
  SET82_LANDEN.forEach(naam => {
    const f = gj.features.find(x => x.properties.name === naam);
    expect(`${naam} polygoon in landen-afrika.geojson`, !!f);
    expect(`${naam} sets bevat 82`, f?.properties.sets?.includes(82));
  });
}

// Rivieren + Victoriameer + Suezkanaal in wateren.geojson
{
  const fs = require('fs');
  const path = require('path');
  const gj = JSON.parse(fs.readFileSync(path.join(__dirname, 'wateren.geojson'), 'utf8'));
  ['Nijl','Congo','Niger','Suezkanaal'].forEach(naam => {
    const f = gj.features.find(x => x.properties.name === naam && x.properties.sets?.includes(82));
    expect(`${naam} LineString in wateren.geojson (set 82)`, f?.geometry.type === 'LineString');
  });
  const vm = gj.features.find(x => x.properties.name === 'Victoriameer' && x.properties.sets?.includes(82));
  expect('Victoriameer Polygon in wateren.geojson (set 82)',
    vm?.geometry.type === 'Polygon' || vm?.geometry.type === 'MultiPolygon');

  // Issue #84 — Nijl mag in Sudd-moeras (4°N–10°N) niet terugspringen
  // naar een zijtak. Check alleen binnen dat bereik; de Grote Nijlbocht
  // bij Dongola (~18°N, ~1.5° ZW-uitstap) is een echte geografische
  // vorm en mag blijven. Sta kleine lokale meanders toe (≤0.15°).
  const nijl = gj.features.find(x => x.properties.name === 'Nijl' && x.properties.sets?.includes(82));
  const coords = nijl?.geometry.coordinates || [];
  let maxSuddBack = 0;
  let runningMax = -Infinity;
  for (const [, lat] of coords) {
    if (lat > runningMax) runningMax = lat;
    const back = runningMax - lat;
    if (lat >= 4 && lat <= 10 && back > maxSuddBack) maxSuddBack = back;
  }
  expect('Nijl backtrack in Sudd (4-10°N) < 0.3°', maxSuddBack < 0.3);
}

// ── Set 83 — Noord- en Midden-Amerika (8.3) ──────────────────

section('Set 83 — Noord- en Midden-Amerika');

const SET83_LANDEN = ['Canada','VS','Mexico','Cuba','Haïti','Guatemala','Nicaragua'];
const SET83_STEDEN = [
  'Ottawa','Toronto','Montréal','Vancouver','Washington','New York','Chicago',
  'Los Angeles','San Francisco','Houston','New Orleans','Miami','Detroit',
  'Denver','Mexico-Stad','Monterrey','Havana',
];
const SET83_GEWESTEN_HARD   = ['Alaska','Groenland','Texas','Florida'];
const SET83_GEBIEDEN_FUZZY  = ['Rocky Mountains','Sierra Nevada','Appalachen'];
const SET83_WATEREN         = ['Mississippi','Rio Grande','Panamakanaal','Caribische Zee'];

expect('Set 83 bestaat in SETS',        !!SETS[83]);
expect('Set 83 is groep 8',             SETS[83]?.group === 8);
expect('Set 83 heeft 4 fases',          SETS[83]?.phases?.length === 4);
expect('Set 83 fase 1 is country',      SETS[83]?.phases?.[0]?.quizType === 'country');
expect('Set 83 fase 2 is place',        SETS[83]?.phases?.[1]?.quizType === 'place');
expect('Set 83 fase 3 is province',     SETS[83]?.phases?.[2]?.quizType === 'province');
expect('Set 83 fase 4 is water',        SETS[83]?.phases?.[3]?.quizType === 'water');
expect('Set 83 heeft bounds',           Array.isArray(SETS[83]?.bounds));
expect('Set 83 heeft continentale klikdrempels (≥250/700)',
  SETS[83]?.clickCorrectKm >= 250 && SETS[83]?.clickCloseKm >= 700);

SET83_LANDEN.forEach(naam => {
  const c = ALL_COUNTRIES.find(x => x.name === naam && x.sets?.includes(83));
  expect(`${naam} in ALL_COUNTRIES (set 83)`, !!c);
});
expect('Set 83 heeft 7 landen', ALL_COUNTRIES.filter(c => c.sets?.includes(83)).length === 7);

SET83_STEDEN.forEach(naam => {
  const s = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(83));
  expect(`${naam} in ALL_CITIES (set 83)`, !!s);
});
expect('Set 83 heeft 17 steden', ALL_CITIES.filter(c => c.sets?.includes(83)).length === 17);

// 4 hoofdsteden: Ottawa, Washington, Mexico-Stad, Havana
const set83Capitals = ALL_CITIES.filter(c => c.sets?.includes(83) && c.capital);
expect('Set 83 heeft 4 hoofdsteden', set83Capitals.length === 4);

SET83_GEWESTEN_HARD.forEach(naam => {
  const g = ALL_PROVINCES.find(p => p.name === naam && p.sets?.includes(83));
  expect(`${naam} in ALL_PROVINCES (set 83)`, !!g);
  expect(`${naam} kind === 'gewest' (set 83)`, g?.kind === 'gewest');
  expect(`${naam} is niet fuzzy (set 83)`, g?.shape !== 'fuzzy');
});

SET83_GEBIEDEN_FUZZY.forEach(naam => {
  const r = ALL_PROVINCES.find(p => p.name === naam && p.sets?.includes(83));
  expect(`${naam} in ALL_PROVINCES (set 83)`, !!r);
  expect(`${naam} is fuzzy (set 83)`, r?.shape === 'fuzzy');
  expect(`${naam} kind === 'gebied' (set 83)`, r?.kind === 'gebied');
});

expect('Set 83 heeft 7 regio\'s (4 gewesten + 3 gebieden)',
  ALL_PROVINCES.filter(p => p.sets?.includes(83)).length === 7);

SET83_WATEREN.forEach(naam => {
  const w = ALL_WATERS.find(x => x.name === naam && x.sets?.includes(83));
  expect(`${naam} in ALL_WATERS (set 83)`, !!w);
});
expect('Set 83 heeft 4 wateren', ALL_WATERS.filter(w => w.sets?.includes(83)).length === 4);

// Landen-polygonen in landen-noord-midden-amerika.geojson
{
  const fs = require('fs');
  const path = require('path');
  const gj = JSON.parse(fs.readFileSync(path.join(__dirname, 'landen-noord-midden-amerika.geojson'), 'utf8'));
  SET83_LANDEN.forEach(naam => {
    const f = gj.features.find(x => x.properties.name === naam);
    expect(`${naam} polygoon in landen-noord-midden-amerika.geojson`, !!f);
    expect(`${naam} sets bevat 83`, f?.properties.sets?.includes(83));
  });
}

// Harde gewesten-polygonen in gewesten.geojson
{
  const fs = require('fs');
  const path = require('path');
  const gj = JSON.parse(fs.readFileSync(path.join(__dirname, 'gewesten.geojson'), 'utf8'));
  SET83_GEWESTEN_HARD.forEach(naam => {
    const f = gj.features.find(x => x.properties.name === naam && x.properties.sets?.includes(83));
    expect(`${naam} polygoon in gewesten.geojson (set 83)`, !!f);
    expect(`${naam} is Polygon/MultiPolygon`,
      f?.geometry.type === 'Polygon' || f?.geometry.type === 'MultiPolygon');
  });
}

// Rivieren + kanaal als LineString in wateren.geojson
// Caribische Zee is fuzzy (policy) — niet in geojson.
{
  const fs = require('fs');
  const path = require('path');
  const gj = JSON.parse(fs.readFileSync(path.join(__dirname, 'wateren.geojson'), 'utf8'));
  ['Mississippi','Rio Grande','Panamakanaal'].forEach(naam => {
    const f = gj.features.find(x => x.properties.name === naam && x.properties.sets?.includes(83));
    expect(`${naam} LineString in wateren.geojson (set 83)`, f?.geometry.type === 'LineString');
  });
  // Mississippi stroomt N→Z (Itasca ~47°N → delta ~29°N).
  const miss = gj.features.find(x => x.properties.name === 'Mississippi' && x.properties.sets?.includes(83));
  if (miss) {
    const c = miss.geometry.coordinates;
    expect('Mississippi start noordelijker dan eind (N→Z)', c[0][1] > c[c.length-1][1]);
  }
}

// ── Set 84 — Midden-Oosten (8.4) ─────────────────────────────

section('Set 84 — Midden-Oosten');

const SET84_LANDEN = [
  'Turkije','Syrië','Libanon','Israël','Jordanië','Irak','Iran',
  'Saoedi-Arabië','Jemen','Koeweit','Georgië','Armenië','Azerbeidzjan',
];
const SET84_STEDEN = [
  'Ankara','Damascus','Beiroet','Jeruzalem','Amman','Bagdad','Teheran',
  'Riyad','Mekka','Sanaa','Tbilisi','Jerevan','Bakoe',
];
const SET84_WATEREN = [
  'Eufraat','Suezkanaal','Rode Zee','Zwarte Zee','Perzische Golf',
  'Kaspische Zee','Middellandse Zee','Indische Oceaan',
];

expect('Set 84 bestaat in SETS',        !!SETS[84]);
expect('Set 84 is groep 8',             SETS[84]?.group === 8);
expect('Set 84 heeft 3 fases',          SETS[84]?.phases?.length === 3);
expect('Set 84 fase 1 is country',      SETS[84]?.phases?.[0]?.quizType === 'country');
expect('Set 84 fase 2 is place',        SETS[84]?.phases?.[1]?.quizType === 'place');
expect('Set 84 fase 3 is water',        SETS[84]?.phases?.[2]?.quizType === 'water');
expect('Set 84 heeft geen province-fase',
  !SETS[84]?.phases?.some(p => p.quizType === 'province'));
expect('Set 84 heeft bounds',           Array.isArray(SETS[84]?.bounds));
expect('Set 84 heeft continentale klikdrempels (≥250/700)',
  SETS[84]?.clickCorrectKm >= 250 && SETS[84]?.clickCloseKm >= 700);

SET84_LANDEN.forEach(naam => {
  const c = ALL_COUNTRIES.find(x => x.name === naam && x.sets?.includes(84));
  expect(`${naam} in ALL_COUNTRIES (set 84)`, !!c);
});
expect('Set 84 heeft 13 landen', ALL_COUNTRIES.filter(c => c.sets?.includes(84)).length === 13);

SET84_STEDEN.forEach(naam => {
  const s = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(84));
  expect(`${naam} in ALL_CITIES (set 84)`, !!s);
});
expect('Set 84 heeft 13 steden', ALL_CITIES.filter(c => c.sets?.includes(84)).length === 13);

// 12 hoofdsteden (alle behalve Mekka).
const set84Capitals = ALL_CITIES.filter(c => c.sets?.includes(84) && c.capital);
expect('Set 84 heeft 12 hoofdsteden', set84Capitals.length === 12);
const mekka = ALL_CITIES.find(c => c.name === 'Mekka' && c.sets?.includes(84));
expect('Mekka is geen hoofdstad', !mekka?.capital);

// Geen gewesten of gebieden — opdrachtblad heeft geen province-fase.
expect('Set 84 heeft 0 regio\'s in ALL_PROVINCES',
  ALL_PROVINCES.filter(p => p.sets?.includes(84)).length === 0);

SET84_WATEREN.forEach(naam => {
  const w = ALL_WATERS.find(x => x.name === naam && x.sets?.includes(84));
  expect(`${naam} in ALL_WATERS (set 84)`, !!w);
});
expect('Set 84 heeft 8 wateren', ALL_WATERS.filter(w => w.sets?.includes(84)).length === 8);

// Fuzzy zeeën moeten shape/rx/ry hebben.
['Zwarte Zee','Perzische Golf','Kaspische Zee','Middellandse Zee','Indische Oceaan','Rode Zee']
  .forEach(naam => {
    const w = ALL_WATERS.find(x => x.name === naam && x.sets?.includes(84));
    expect(`${naam} is fuzzy (set 84)`, w?.shape === 'fuzzy');
    expect(`${naam} heeft rx/ry (set 84)`, typeof w?.rx === 'number' && typeof w?.ry === 'number');
  });

// Landen-polygonen in landen-midden-oosten.geojson
{
  const fs = require('fs');
  const path = require('path');
  const gj = JSON.parse(fs.readFileSync(path.join(__dirname, 'landen-midden-oosten.geojson'), 'utf8'));
  SET84_LANDEN.forEach(naam => {
    const f = gj.features.find(x => x.properties.name === naam);
    expect(`${naam} polygoon in landen-midden-oosten.geojson`, !!f);
    expect(`${naam} sets bevat 84`, f?.properties.sets?.includes(84));
  });
}

// Eufraat als LineString, Suezkanaal gedeeld met set 82.
{
  const fs = require('fs');
  const path = require('path');
  const gj = JSON.parse(fs.readFileSync(path.join(__dirname, 'wateren.geojson'), 'utf8'));
  const euf = gj.features.find(x => x.properties.name === 'Eufraat' && x.properties.sets?.includes(84));
  expect('Eufraat LineString in wateren.geojson (set 84)', euf?.geometry.type === 'LineString');
  // Eufraat stroomt NO → ZO (Turkije ~39°N → Shatt al-Arab ~31°N).
  if (euf) {
    const c = euf.geometry.coordinates;
    expect('Eufraat start noordelijker dan eind (N→Z)', c[0][1] > c[c.length-1][1]);
  }
  const suez = gj.features.find(x => x.properties.name === 'Suezkanaal');
  expect('Suezkanaal sets bevat 82', suez?.properties.sets?.includes(82));
  expect('Suezkanaal sets bevat 84', suez?.properties.sets?.includes(84));
}

// ── Set 85 — Zuid-Azië (8.5) ─────────────────────────────────

section('Set 85 — Zuid-Azië');

const SET85_LANDEN = ['Kazachstan','Oezbekistan','Afghanistan','Pakistan','India','Nepal','Bangladesh','Sri Lanka'];
const SET85_STEDEN = [
  'Almaty','Tasjkent','Kabul','Islamabad','Lahore','Karachi',
  'New Delhi','Mumbai','Chennai','Kolkata','Kathmandu','Dhaka',
];
const SET85_GEBIEDEN = ['Himalaya','Mount Everest'];
const SET85_WATEREN  = ['Ganges','Indus','Arabische Zee','Golf van Bengalen','Indische Oceaan'];

expect('Set 85 bestaat in SETS',        !!SETS[85]);
expect('Set 85 is groep 8',             SETS[85]?.group === 8);
expect('Set 85 heeft 4 fases',          SETS[85]?.phases?.length === 4);
expect('Set 85 fase 1 is country',      SETS[85]?.phases?.[0]?.quizType === 'country');
expect('Set 85 fase 2 is place',        SETS[85]?.phases?.[1]?.quizType === 'place');
expect('Set 85 fase 3 is province',     SETS[85]?.phases?.[2]?.quizType === 'province');
expect('Set 85 fase 4 is water',        SETS[85]?.phases?.[3]?.quizType === 'water');
expect('Set 85 heeft bounds',           Array.isArray(SETS[85]?.bounds));
expect('Set 85 heeft continentale klikdrempels (≥250/700)',
  SETS[85]?.clickCorrectKm >= 250 && SETS[85]?.clickCloseKm >= 700);

SET85_LANDEN.forEach(naam => {
  const c = ALL_COUNTRIES.find(x => x.name === naam && x.sets?.includes(85));
  expect(`${naam} in ALL_COUNTRIES (set 85)`, !!c);
});
expect('Set 85 heeft 8 landen', ALL_COUNTRIES.filter(c => c.sets?.includes(85)).length === 8);

SET85_STEDEN.forEach(naam => {
  const s = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(85));
  expect(`${naam} in ALL_CITIES (set 85)`, !!s);
});
expect('Set 85 heeft 12 steden', ALL_CITIES.filter(c => c.sets?.includes(85)).length === 12);

// 6 hoofdsteden: Tasjkent, Kabul, Islamabad, New Delhi, Kathmandu, Dhaka.
const set85Capitals = ALL_CITIES.filter(c => c.sets?.includes(85) && c.capital);
expect('Set 85 heeft 6 hoofdsteden', set85Capitals.length === 6);
const almaty = ALL_CITIES.find(c => c.name === 'Almaty' && c.sets?.includes(85));
expect('Almaty is geen hoofdstad (Astana is KZ-hoofdstad)', !almaty?.capital);

// Sri Lanka: geen stad in opdrachtblad.
expect('Geen Colombo in set 85 (opdrachtblad vraagt geen SL-stad)',
  !ALL_CITIES.find(c => c.name === 'Colombo' && c.sets?.includes(85)));

SET85_GEBIEDEN.forEach(naam => {
  const g = ALL_PROVINCES.find(p => p.name === naam && p.sets?.includes(85));
  expect(`${naam} in ALL_PROVINCES (set 85)`, !!g);
});
expect('Set 85 heeft 2 regio\'s', ALL_PROVINCES.filter(p => p.sets?.includes(85)).length === 2);

const himalaya = ALL_PROVINCES.find(p => p.name === 'Himalaya' && p.sets?.includes(85));
expect('Himalaya is fuzzy', himalaya?.shape === 'fuzzy');
expect('Himalaya kind === gebied', himalaya?.kind === 'gebied');

const everest = ALL_PROVINCES.find(p => p.name === 'Mount Everest' && p.sets?.includes(85));
expect('Mount Everest is peak', everest?.shape === 'peak');
expect('Mount Everest kind === berg', everest?.kind === 'berg');
expect('Mount Everest heeft size', typeof everest?.size === 'number');
// Everest ligt op ~27.99°N/86.93°E.
expect('Mount Everest coord ~27.99°N', Math.abs((everest?.lat ?? 0) - 27.99) < 0.1);
expect('Mount Everest coord ~86.93°E', Math.abs((everest?.lon ?? 0) - 86.93) < 0.1);

SET85_WATEREN.forEach(naam => {
  const w = ALL_WATERS.find(x => x.name === naam && x.sets?.includes(85));
  expect(`${naam} in ALL_WATERS (set 85)`, !!w);
});
expect('Set 85 heeft 5 wateren', ALL_WATERS.filter(w => w.sets?.includes(85)).length === 5);

// Fuzzy zeeën: Arabische Zee, Golf van Bengalen, Indische Oceaan.
['Arabische Zee','Golf van Bengalen','Indische Oceaan'].forEach(naam => {
  const w = ALL_WATERS.find(x => x.name === naam && x.sets?.includes(85));
  expect(`${naam} is fuzzy (set 85)`, w?.shape === 'fuzzy');
});

// Indische Oceaan gedeeld met set 84.
const io = ALL_WATERS.find(w => w.name === 'Indische Oceaan');
expect('Indische Oceaan sets bevat 84', io?.sets?.includes(84));
expect('Indische Oceaan sets bevat 85', io?.sets?.includes(85));

// Landen-polygonen in landen-zuid-azie.geojson
{
  const fs = require('fs');
  const path = require('path');
  const gj = JSON.parse(fs.readFileSync(path.join(__dirname, 'landen-zuid-azie.geojson'), 'utf8'));
  SET85_LANDEN.forEach(naam => {
    const f = gj.features.find(x => x.properties.name === naam);
    expect(`${naam} polygoon in landen-zuid-azie.geojson`, !!f);
    expect(`${naam} sets bevat 85`, f?.properties.sets?.includes(85));
  });
}

// Ganges + Indus als LineString in wateren.geojson.
{
  const fs = require('fs');
  const path = require('path');
  const gj = JSON.parse(fs.readFileSync(path.join(__dirname, 'wateren.geojson'), 'utf8'));
  ['Ganges','Indus'].forEach(naam => {
    const f = gj.features.find(x => x.properties.name === naam && x.properties.sets?.includes(85));
    expect(`${naam} LineString in wateren.geojson (set 85)`, f?.geometry.type === 'LineString');
  });
  // Ganges: Gangotri ~30.9°N/79.1°E → Bengal delta ~22°N/90°E. NW → ZO.
  const g = gj.features.find(x => x.properties.name === 'Ganges' && x.properties.sets?.includes(85));
  if (g) {
    const c = g.geometry.coordinates;
    expect('Ganges start noordelijker dan eind (N→Z)', c[0][1] > c[c.length-1][1]);
    expect('Ganges start westelijker dan eind (W→O)', c[0][0] < c[c.length-1][0]);
  }
  // Indus: Tibet ~32°N/81°E → Karachi ~24°N/67°E. NE → ZW.
  const i = gj.features.find(x => x.properties.name === 'Indus' && x.properties.sets?.includes(85));
  if (i) {
    const c = i.geometry.coordinates;
    expect('Indus start noordelijker dan eind (N→Z)', c[0][1] > c[c.length-1][1]);
    expect('Indus start oostelijker dan eind (O→W)', c[0][0] > c[c.length-1][0]);
  }
}

// ── Set 86 — Oost-Azië (8.6) ─────────────────────────────────

section('Set 86 — Oost-Azië');

const SET86_LANDEN = ['Rusland','Mongolië','China','Japan','Noord-Korea','Zuid-Korea','Taiwan'];
const SET86_STEDEN = [
  'Omsk','Novosibirsk','Irkoetsk','Vladivostok','Harbin',
  'Ulaanbaatar','Beijing','Shanghai','Hongkong',
  'Tokyo','Osaka','Sapporo','Pyongyang','Seoul',
];
const SET86_GEBIEDEN = ['Tibet','Gobi','Siberië'];
const SET86_WATEREN  = ['Huang He','Chang Jiang','Zuid-Chinese Zee','Grote Oceaan'];

expect('Set 86 bestaat in SETS',        !!SETS[86]);
expect('Set 86 is groep 8',             SETS[86]?.group === 8);
expect('Set 86 heeft 4 fases',          SETS[86]?.phases?.length === 4);
expect('Set 86 fase 1 is country',      SETS[86]?.phases?.[0]?.quizType === 'country');
expect('Set 86 fase 2 is place',        SETS[86]?.phases?.[1]?.quizType === 'place');
expect('Set 86 fase 3 is province',     SETS[86]?.phases?.[2]?.quizType === 'province');
expect('Set 86 fase 4 is water',        SETS[86]?.phases?.[3]?.quizType === 'water');
expect('Set 86 heeft bounds',           Array.isArray(SETS[86]?.bounds));
expect('Set 86 heeft continentale klikdrempels (≥250/700)',
  SETS[86]?.clickCorrectKm >= 250 && SETS[86]?.clickCloseKm >= 700);

SET86_LANDEN.forEach(naam => {
  const c = ALL_COUNTRIES.find(x => x.name === naam && x.sets?.includes(86));
  expect(`${naam} in ALL_COUNTRIES (set 86)`, !!c);
});
expect('Set 86 heeft 7 landen (incl. Taiwan)', ALL_COUNTRIES.filter(c => c.sets?.includes(86)).length === 7);

SET86_STEDEN.forEach(naam => {
  const s = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(86));
  expect(`${naam} in ALL_CITIES (set 86)`, !!s);
});
expect('Set 86 heeft 14 steden', ALL_CITIES.filter(c => c.sets?.includes(86)).length === 14);

// 5 hoofdsteden: Beijing, Tokyo, Ulaanbaatar, Pyongyang, Seoul.
const set86Capitals = ALL_CITIES.filter(c => c.sets?.includes(86) && c.capital);
expect('Set 86 heeft 5 hoofdsteden', set86Capitals.length === 5);

// Moskou en Taipei staan niet in opdrachtblad.
expect('Geen Moskou in set 86',
  !ALL_CITIES.find(c => c.name === 'Moskou' && c.sets?.includes(86)));
expect('Geen Taipei in set 86',
  !ALL_CITIES.find(c => c.name === 'Taipei' && c.sets?.includes(86)));

// Hongkong is wél stad, maar geen hoofdstad.
const hk = ALL_CITIES.find(c => c.name === 'Hongkong' && c.sets?.includes(86));
expect('Hongkong is stad in set 86', !!hk);
expect('Hongkong is geen hoofdstad',  !hk?.capital);

SET86_GEBIEDEN.forEach(naam => {
  const g = ALL_PROVINCES.find(p => p.name === naam && p.sets?.includes(86));
  expect(`${naam} in ALL_PROVINCES (set 86)`, !!g);
  expect(`${naam} is fuzzy`,         g?.shape === 'fuzzy');
  expect(`${naam} kind === gebied`,  g?.kind === 'gebied');
});
expect('Set 86 heeft 3 gebieden', ALL_PROVINCES.filter(p => p.sets?.includes(86)).length === 3);

SET86_WATEREN.forEach(naam => {
  const w = ALL_WATERS.find(x => x.name === naam && x.sets?.includes(86));
  expect(`${naam} in ALL_WATERS (set 86)`, !!w);
});
expect('Set 86 heeft 4 wateren', ALL_WATERS.filter(w => w.sets?.includes(86)).length === 4);

// Fuzzy zeeën.
['Zuid-Chinese Zee','Grote Oceaan'].forEach(naam => {
  const w = ALL_WATERS.find(x => x.name === naam && x.sets?.includes(86));
  expect(`${naam} is fuzzy (set 86)`, w?.shape === 'fuzzy');
});

// Landen-polygonen in landen-oost-azie.geojson.
{
  const fs = require('fs');
  const path = require('path');
  const gj = JSON.parse(fs.readFileSync(path.join(__dirname, 'landen-oost-azie.geojson'), 'utf8'));
  SET86_LANDEN.forEach(naam => {
    const f = gj.features.find(x => x.properties.name === naam);
    expect(`${naam} polygoon in landen-oost-azie.geojson`, !!f);
    expect(`${naam} sets bevat 86`, f?.properties.sets?.includes(86));
  });
  // Rusland moet vol zijn (>2000 pts na eps=0.05).
  const rus = gj.features.find(x => x.properties.name === 'Rusland');
  const countPts = (g) => g.type === 'Polygon' ? g.coordinates.reduce((n,r)=>n+r.length,0)
                                               : g.coordinates.reduce((n,p)=>n+p.reduce((nn,r)=>nn+r.length,0),0);
  expect('Rusland heeft ≥2000 pts (volledige polygoon)', countPts(rus.geometry) >= 2000);
}

// Huang He + Chang Jiang als LineString, beide W→O.
{
  const fs = require('fs');
  const path = require('path');
  const gj = JSON.parse(fs.readFileSync(path.join(__dirname, 'wateren.geojson'), 'utf8'));
  ['Huang He','Chang Jiang'].forEach(naam => {
    const f = gj.features.find(x => x.properties.name === naam && x.properties.sets?.includes(86));
    expect(`${naam} LineString in wateren.geojson (set 86)`, f?.geometry.type === 'LineString');
    if (f) {
      const c = f.geometry.coordinates;
      expect(`${naam} stroomt W→O`, c[0][0] < c[c.length-1][0]);
    }
  });
}

// ── Set 87 — Zuidoost-Azië (8.7) ─────────────────────────────────
section('Set 87 — Zuidoost-Azië (8.7)');

expect('Set 87 bestaat',                 !!SETS[87]);
expect('Set 87 group = 8',                SETS[87]?.group === 8);
expect('Set 87 heeft 4 phases',           SETS[87]?.phases?.length === 4);
expect('Set 87 phase 1 = country',        SETS[87]?.phases[0].quizType === 'country');
expect('Set 87 phase 2 = place',          SETS[87]?.phases[1].quizType === 'place');
expect('Set 87 phase 3 = province',       SETS[87]?.phases[2].quizType === 'province');
expect('Set 87 phase 4 = water',          SETS[87]?.phases[3].quizType === 'water');
expect('Set 87 phase 3 label = Eilanden', SETS[87]?.phases[2].label === 'Eilanden');
expect('Set 87 heeft bounds',             Array.isArray(SETS[87]?.bounds));

// 9 landen
for (const naam of ['Myanmar','Thailand','Vietnam','Cambodja','Laos',
                    'Maleisië','Singapore','Indonesië','Filipijnen']) {
  const c = ALL_COUNTRIES.find(l => l.name === naam && l.sets?.includes(87));
  expect(`${naam} in ALL_COUNTRIES (set 87)`, !!c);
}

// 11 steden
for (const naam of ['Yangon','Bangkok','Hanoi','Ho Chi Minhstad','Phnom Penh',
                    'Vientiane','Kuala Lumpur','Singapore','Jakarta',
                    'Surabaya','Manila']) {
  const s = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(87));
  expect(`${naam} in ALL_CITIES (set 87)`, !!s);
}

// Yangon = stad, niet hoofdstad (Naypyidaw niet in opdrachtblad)
const yangon = ALL_CITIES.find(c => c.name === 'Yangon' && c.sets?.includes(87));
expect('Yangon is stad (niet hoofdstad)', yangon && !yangon.capital);

// 8 hoofdsteden (Myanmar heeft geen hoofdstad in de set — Yangon is stad,
// Naypyidaw staat niet in opdrachtblad)
const caps87 = ALL_CITIES.filter(c => c.sets?.includes(87) && c.capital).map(c => c.name).sort();
expect('Set 87 heeft 8 hoofdsteden', caps87.length === 8);
expect('Set 87 hoofdsteden correct',
  JSON.stringify(caps87) === JSON.stringify(['Bangkok','Hanoi','Jakarta','Kuala Lumpur','Manila','Phnom Penh','Singapore','Vientiane']));

// 5 eilanden (gebieden-fase) — echte polygons, kind='eiland'
for (const naam of ['Kalimantan','Sumatra','Sulawesi','Java','Molukken']) {
  const e = ALL_PROVINCES.find(p => p.name === naam && p.sets?.includes(87));
  expect(`${naam} in ALL_PROVINCES (set 87)`, !!e);
  expect(`${naam} kind = 'eiland'`, e?.kind === 'eiland');
  expect(`${naam} niet fuzzy`, e?.shape !== 'fuzzy');
}

// 2 wateren: Grote Oceaan + Indische Oceaan (beide al bestaand, set 87 toegevoegd)
const grOc87 = ALL_WATERS.find(w => w.name === 'Grote Oceaan' && w.sets?.includes(87));
expect('Grote Oceaan ook in set 87', !!grOc87);
const inOc87 = ALL_WATERS.find(w => w.name === 'Indische Oceaan' && w.sets?.includes(87));
expect('Indische Oceaan ook in set 87', !!inOc87);

// Eilanden-polygonen in eilanden-zuidoost-azie.geojson
{
const fs = require('fs');
const eilGj = JSON.parse(fs.readFileSync('eilanden-zuidoost-azie.geojson', 'utf8'));
expect('eilanden-zuidoost-azie.geojson heeft 5 features', eilGj.features.length === 5);
for (const naam of ['Kalimantan','Sumatra','Sulawesi','Java','Molukken']) {
  const f = eilGj.features.find(x => x.properties.name === naam);
  expect(`${naam} polygoon aanwezig`, !!f);
  expect(`${naam} is Polygon/MultiPolygon`,
    f?.geometry.type === 'Polygon' || f?.geometry.type === 'MultiPolygon');
  expect(`${naam} sets bevat 87`, f?.properties.sets?.includes(87));
}

// 9 landen-polygonen in landen-zuidoost-azie.geojson
const landGj87 = JSON.parse(fs.readFileSync('landen-zuidoost-azie.geojson', 'utf8'));
expect('landen-zuidoost-azie.geojson heeft 9 features', landGj87.features.length === 9);
for (const naam of ['Myanmar','Thailand','Vietnam','Cambodja','Laos',
                    'Maleisië','Singapore','Indonesië','Filipijnen']) {
  const f = landGj87.features.find(x => x.properties.name === naam);
  expect(`${naam} polygoon in landen-zuidoost-azie.geojson`, !!f);
  expect(`${naam} sets bevat 87`, f?.properties.sets?.includes(87));
}
}

// ── Set 88 — Australië en Oceanië (8.8) ─────────────────────────
section('Set 88 — Australië en Oceanië (8.8)');

expect('Set 88 bestaat',                 !!SETS[88]);
expect('Set 88 group = 8',                SETS[88]?.group === 8);
expect('Set 88 heeft 4 phases',           SETS[88]?.phases?.length === 4);
expect('Set 88 phase 1 = country',        SETS[88]?.phases[0].quizType === 'country');
expect('Set 88 phase 2 = place',          SETS[88]?.phases[1].quizType === 'place');
expect('Set 88 phase 3 = province',       SETS[88]?.phases[2].quizType === 'province');
expect('Set 88 phase 4 = water',          SETS[88]?.phases[3].quizType === 'water');
expect('Set 88 phase 3 label = Gebieden', SETS[88]?.phases[2].label === 'Gebieden');
expect('Set 88 heeft bounds',             Array.isArray(SETS[88]?.bounds));

// 3 landen
for (const naam of ['Australië','Nieuw-Zeeland','Papoea-Nieuw-Guinea']) {
  const c = ALL_COUNTRIES.find(l => l.name === naam && l.sets?.includes(88));
  expect(`${naam} in ALL_COUNTRIES (set 88)`, !!c);
}

// 10 steden
const cities88 = ALL_CITIES.filter(c => c.sets?.includes(88));
expect('Set 88 heeft 10 steden', cities88.length === 10);
for (const naam of ['Sydney','Melbourne','Brisbane','Perth','Adelaide','Canberra',
                    'Darwin','Auckland','Wellington','Port Moresby']) {
  const s = ALL_CITIES.find(c => c.name === naam && c.sets?.includes(88));
  expect(`${naam} in ALL_CITIES (set 88)`, !!s);
}

// 3 hoofdsteden: Canberra, Wellington, Port Moresby
const caps88 = cities88.filter(c => c.capital).map(c => c.name).sort();
expect('Set 88 heeft 3 hoofdsteden', caps88.length === 3);
expect('Set 88 hoofdsteden correct',
  JSON.stringify(caps88) === JSON.stringify(['Canberra','Port Moresby','Wellington']));

// Sydney niet hoofdstad (bekende valkuil — grootste stad, maar Canberra is hoofdstad)
const sydney = ALL_CITIES.find(c => c.name === 'Sydney' && c.sets?.includes(88));
expect('Sydney niet hoofdstad', sydney && !sydney.capital);

// Auckland niet hoofdstad (grootste NZ-stad, Wellington is hoofdstad)
const auckland = ALL_CITIES.find(c => c.name === 'Auckland' && c.sets?.includes(88));
expect('Auckland niet hoofdstad', auckland && !auckland.capital);

// 3 gebieden: Tasmanië (eiland, echte polygoon), Grote Victoria-Woestijn (fuzzy),
// Antarctica (gebied, echte polygoon).
const tas = ALL_PROVINCES.find(p => p.name === 'Tasmanië' && p.sets?.includes(88));
expect('Tasmanië in ALL_PROVINCES (set 88)', !!tas);
expect('Tasmanië kind = eiland',               tas?.kind === 'eiland');
expect('Tasmanië niet fuzzy',                  tas?.shape !== 'fuzzy');

const gvw = ALL_PROVINCES.find(p => p.name === 'Grote Victoria-Woestijn' && p.sets?.includes(88));
expect('Grote Victoria-Woestijn in set 88', !!gvw);
expect('Grote Victoria-Woestijn is fuzzy',  gvw?.shape === 'fuzzy');

const ant = ALL_PROVINCES.find(p => p.name === 'Antarctica' && p.sets?.includes(88));
expect('Antarctica in ALL_PROVINCES (set 88)', !!ant);
expect('Antarctica niet fuzzy',                ant?.shape !== 'fuzzy');

// 2 wateren: Grote Oceaan + Indische Oceaan met posBySet[88] override
const grOc88 = ALL_WATERS.find(w => w.name === 'Grote Oceaan' && w.sets?.includes(88));
expect('Grote Oceaan ook in set 88',                    !!grOc88);
expect('Grote Oceaan heeft posBySet[88]',               !!grOc88?.posBySet?.[88]);
expect('Grote Oceaan set-88 override op zuidelijke hemisfeer',
  grOc88?.posBySet?.[88]?.lat < 0);

const inOc88 = ALL_WATERS.find(w => w.name === 'Indische Oceaan' && w.sets?.includes(88));
expect('Indische Oceaan ook in set 88',                 !!inOc88);
expect('Indische Oceaan heeft posBySet[88]',            !!inOc88?.posBySet?.[88]);
expect('Indische Oceaan set-88 override op zuidelijke hemisfeer',
  inOc88?.posBySet?.[88]?.lat < 0);

// Polygon-bestanden
{
const fs = require('fs');
const landGj88 = JSON.parse(fs.readFileSync('landen-oceanie.geojson', 'utf8'));
expect('landen-oceanie.geojson heeft 3 features', landGj88.features.length === 3);
for (const naam of ['Australië','Nieuw-Zeeland','Papoea-Nieuw-Guinea']) {
  const f = landGj88.features.find(x => x.properties.name === naam);
  expect(`${naam} polygoon in landen-oceanie.geojson`, !!f);
  expect(`${naam} sets bevat 88`, f?.properties.sets?.includes(88));
}

const gebGj = JSON.parse(fs.readFileSync('gebieden-oceanie.geojson', 'utf8'));
expect('gebieden-oceanie.geojson heeft 2 features', gebGj.features.length === 2);
for (const naam of ['Tasmanië','Antarctica']) {
  const f = gebGj.features.find(x => x.properties.name === naam);
  expect(`${naam} polygoon in gebieden-oceanie.geojson`, !!f);
  expect(`${naam} is Polygon/MultiPolygon`,
    f?.geometry.type === 'Polygon' || f?.geometry.type === 'MultiPolygon');
  expect(`${naam} sets bevat 88`, f?.properties.sets?.includes(88));
}
}

section('Set 89 — Midden-Amerika en Caraïben (8.9)');

expect('Set 89 bestaat',                   !!SETS[89]);
expect('Set 89 groep = 8',                 SETS[89]?.group === 8);
expect('Set 89 heeft 4 phases',            SETS[89]?.phases.length === 4);
expect('Set 89 phase 1 = country',         SETS[89]?.phases[0].quizType === 'country');
expect('Set 89 phase 2 = place',           SETS[89]?.phases[1].quizType === 'place');
expect('Set 89 phase 3 = province',        SETS[89]?.phases[2].quizType === 'province');
expect('Set 89 phase 3 label = Eilanden',  SETS[89]?.phases[2].label === 'Eilanden');
expect('Set 89 phase 4 = water',           SETS[89]?.phases[3].quizType === 'water');
expect('Set 89 heeft bounds',              Array.isArray(SETS[89]?.bounds));

// 11 landen (4 Caraïbisch + 7 Midden-Amerikaans)
const landen89 = ALL_COUNTRIES.filter(c => c.sets?.includes(89));
expect('Set 89 heeft 11 landen', landen89.length === 11);
for (const naam of ['Cuba','Jamaica','Haïti','Dominicaanse Republiek',
                    'Guatemala','Belize','Honduras','El Salvador',
                    'Nicaragua','Costa Rica','Panama']) {
  const c = ALL_COUNTRIES.find(l => l.name === naam && l.sets?.includes(89));
  expect(`${naam} in ALL_COUNTRIES (set 89)`, !!c);
}

// 2 steden: Havana + Willemstad (enige op opdrachtblad)
const cities89 = ALL_CITIES.filter(c => c.sets?.includes(89));
expect('Set 89 heeft 2 steden', cities89.length === 2);
const havana = ALL_CITIES.find(c => c.name === 'Havana' && c.sets?.includes(89));
expect('Havana in ALL_CITIES (set 89)', !!havana);
expect('Havana is hoofdstad',           havana?.capital === true);
const wst = ALL_CITIES.find(c => c.name === 'Willemstad' && c.sets?.includes(89));
expect('Willemstad in ALL_CITIES (set 89)', !!wst);
expect('Willemstad is hoofdstad',           wst?.capital === true);

// 6 Antillen: alle als echte polygon (consistente rendering)
const antillen89 = ALL_PROVINCES.filter(p => p.sets?.includes(89));
expect('Set 89 heeft 6 Antillen', antillen89.length === 6);
for (const naam of ['Aruba','Curaçao','Bonaire','Sint Maarten','Saba','Sint Eustatius']) {
  const p = ALL_PROVINCES.find(x => x.name === naam && x.sets?.includes(89));
  expect(`${naam} in ALL_PROVINCES (set 89)`, !!p);
  expect(`${naam} kind = eiland`,              p?.kind === 'eiland');
  expect(`${naam} niet fuzzy (polygon)`,       p?.shape !== 'fuzzy');
}

// Wateren: Caribische Zee + Panamakanaal + Atlantische + Grote Oceaan (4)
const wateren89 = ALL_WATERS.filter(w => w.sets?.includes(89));
expect('Set 89 heeft 4 wateren', wateren89.length === 4);
const carZee = ALL_WATERS.find(w => w.name === 'Caribische Zee' && w.sets?.includes(89));
expect('Caribische Zee ook in set 89',       !!carZee);
expect('Caribische Zee blijft ook in set 83', carZee?.sets?.includes(83));
const panK = ALL_WATERS.find(w => w.name === 'Panamakanaal' && w.sets?.includes(89));
expect('Panamakanaal ook in set 89',          !!panK);
expect('Panamakanaal blijft ook in set 83',   panK?.sets?.includes(83));
// wateren.geojson-feature moet óók sets:[...,89] hebben, anders rendert
// de LineString niet in set 89 (filter op feature.properties.sets).
{
  const fs = require('fs');
  const gjW = JSON.parse(fs.readFileSync('wateren.geojson', 'utf8'));
  const panGj = gjW.features.find(f => f.properties.name === 'Panamakanaal');
  expect('Panamakanaal in wateren.geojson',     !!panGj);
  expect('Panamakanaal geojson-sets bevat 89',  panGj?.properties.sets?.includes(89));
  expect('Panamakanaal geojson-sets bevat 83',  panGj?.properties.sets?.includes(83));
}

// Atlantische Oceaan: omgezet naar fuzzy met posBySet[89]
const atl = ALL_WATERS.find(w => w.name === 'Atlantische Oceaan');
expect('Atlantische Oceaan is fuzzy',         atl?.shape === 'fuzzy');
expect('Atlantische Oceaan heeft rx/ry',      atl?.rx > 0 && atl?.ry > 0);
expect('Atlantische Oceaan in set 78 én 89',  atl?.sets?.includes(78) && atl?.sets?.includes(89));
expect('Atlantische Oceaan posBySet[89]',     !!atl?.posBySet?.[89]);
expect('Atlantische Oceaan set-89 op Caraïbisch breedtegraad',
  atl?.posBySet?.[89]?.lat > 10 && atl?.posBySet?.[89]?.lat < 30);

// Grote Oceaan uitgebreid met set 89 override
const grOc89 = ALL_WATERS.find(w => w.name === 'Grote Oceaan' && w.sets?.includes(89));
expect('Grote Oceaan ook in set 89',          !!grOc89);
expect('Grote Oceaan heeft posBySet[89]',     !!grOc89?.posBySet?.[89]);
expect('Grote Oceaan set-89 override op westelijke hemisfeer (west van Midden-Amerika)',
  grOc89?.posBySet?.[89]?.lon < -85);

// Polygon-bestanden
{
const fs = require('fs');
const landGj89 = JSON.parse(fs.readFileSync('landen-midden-amerika.geojson', 'utf8'));
expect('landen-midden-amerika.geojson heeft 11 features', landGj89.features.length === 11);
for (const naam of ['Cuba','Jamaica','Haïti','Dominicaanse Republiek',
                    'Guatemala','Belize','Honduras','El Salvador',
                    'Nicaragua','Costa Rica','Panama']) {
  const f = landGj89.features.find(x => x.properties.name === naam);
  expect(`${naam} polygoon in landen-midden-amerika.geojson`, !!f);
  expect(`${naam} sets bevat 89`, f?.properties.sets?.includes(89));
}

const eilGj89 = JSON.parse(fs.readFileSync('eilanden-midden-amerika.geojson', 'utf8'));
expect('eilanden-midden-amerika.geojson heeft 6 features', eilGj89.features.length === 6);
for (const naam of ['Aruba','Curaçao','Bonaire','Sint Maarten','Saba','Sint Eustatius']) {
  const f = eilGj89.features.find(x => x.properties.name === naam);
  expect(`${naam} polygoon in eilanden-midden-amerika.geojson`, !!f);
  expect(`${naam} is Polygon/MultiPolygon`,
    f?.geometry.type === 'Polygon' || f?.geometry.type === 'MultiPolygon');
  expect(`${naam} sets bevat 89`, f?.properties.sets?.includes(89));
}
}

// ── nearbyDistractors — MC fallback bij smalle phase-pool ─────
//
// Bij fases met <4 items (bijv. 1 water, 2 regio's in set 81) moet de MC-modus
// toch 3 distractors kunnen tonen. Strategie: als activeCities te klein is,
// pad dan met dichtstbijzijnde items uit de globale pool van dezelfde quizType.

section('nearbyDistractors — MC fallback');

function distSq(a, b) {
  const dlat = a.lat - b.lat, dlon = a.lon - b.lon;
  return dlat * dlat + dlon * dlon;
}

// Spiegel van index.html-implementatie.
function makeNearbyDistractors(activeCities, globalPool) {
  return function(city, n) {
    let pool = activeCities.filter(c => c !== city);
    if (pool.length < n && globalPool) {
      const extra = globalPool.filter(c => c !== city && !pool.includes(c));
      pool = pool.concat(extra);
    }
    const sorted = pool.sort((a, b) => distSq(a, city) - distSq(b, city));
    const candidates = sorted.slice(0, Math.min(8, sorted.length));
    // geen shuffle in test — deterministisch
    return candidates.slice(0, n);
  };
}

{
  const target = { name: 'Amazone', lat: -3, lon: -60 };
  const activeOne = [target]; // alleen Amazone actief
  const global = [
    target,
    { name: 'Orinoco', lat: 8,  lon: -63 },
    { name: 'Rijn',    lat: 51, lon: 6   },
    { name: 'Donau',   lat: 45, lon: 20  },
    { name: 'Nijl',    lat: 25, lon: 32  },
  ];
  const fn = makeNearbyDistractors(activeOne, global);
  const got = fn(target, 3);
  expect('fallback levert 3 distractors bij 1 actief item', got.length === 3);
  expect('target staat niet in distractors', !got.some(c => c.name === 'Amazone'));
  expect('dichtstbij (Orinoco) eerst', got[0]?.name === 'Orinoco');
}

{
  const target = { name: 'Andes', lat: -20, lon: -70 };
  const activeTwo = [target, { name: 'Vuurland', lat: -54, lon: -68 }];
  const global = [
    ...activeTwo,
    { name: 'Alpen',    lat: 46, lon: 10 },
    { name: 'Pyreneeën', lat: 42, lon: 1 },
  ];
  const fn = makeNearbyDistractors(activeTwo, global);
  const got = fn(target, 3);
  expect('fallback levert 3 distractors bij 2 actieve items', got.length === 3);
  expect('Vuurland in distractors (actieve buur)', got.some(c => c.name === 'Vuurland'));
}

{
  // Bij voldoende active items: geen fallback — global pool wordt genegeerd.
  const target = { name: 'A', lat: 0, lon: 0 };
  const active = [
    target,
    { name: 'B', lat: 0, lon: 1 },
    { name: 'C', lat: 0, lon: 2 },
    { name: 'D', lat: 0, lon: 3 },
    { name: 'E', lat: 0, lon: 4 },
  ];
  const fn = makeNearbyDistractors(active, [{ name: 'Z', lat: 0, lon: 0.5 }]);
  const got = fn(target, 3);
  expect('geen fallback wanneer active genoeg items heeft',
    !got.some(c => c.name === 'Z'));
}

// ── Samenvatting ──────────────────────────────────────────────

console.log(`\n${'─'.repeat(44)}`);
if (failed === 0) {
  console.log(`✅ ${passed} tests geslaagd`);
} else {
  console.log(`❌ ${failed} test(s) mislukt, ${passed} geslaagd`);
  process.exit(1);
}
