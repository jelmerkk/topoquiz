#!/usr/bin/env node
// Topografie Quiz — lokale testsuite
// Gebruik: node test.js

'use strict';

const { ALL_CITIES, ALL_PROVINCES, SETS, cityRadius } = require('./cities.js');

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

const outOfBounds = ALL_CITIES.filter(c =>
  c.lat < NL_LAT[0] || c.lat > NL_LAT[1] || c.lon < NL_LON[0] || c.lon > NL_LON[1]
);
expect('Alle coördinaten liggen binnen Nederland', outOfBounds.length === 0,
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
  if (set.bonus || set.daily) return;      // deze sets gebruiken runtime-sampling, niet een vaste set-filter
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

const invalidQuizTypes = setEntries.filter(([, s]) => !['place', 'province'].includes(s.quizType));
expect('Alle sets hebben een geldig quizType (place of province)',
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

function clickResult(distKm) {
  if (distKm < CLICK_CORRECT_KM) return 'correct';
  if (distKm < CLICK_CLOSE_KM)   return 'close';
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

section('clickResult()');

expect('0 km → correct',    clickResult(0)    === 'correct');
expect('10 km → correct',   clickResult(10)   === 'correct');
expect('19 km → correct',   clickResult(19)   === 'correct');
expect('20 km → close',     clickResult(20)   === 'close');
expect('40 km → close',     clickResult(40)   === 'close');
expect('59 km → close',     clickResult(59)   === 'close');
expect('60 km → wrong',     clickResult(60)   === 'wrong');
expect('150 km → wrong',    clickResult(150)  === 'wrong');

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

// ── Samenvatting ──────────────────────────────────────────────

console.log(`\n${'─'.repeat(44)}`);
if (failed === 0) {
  console.log(`✅ ${passed} tests geslaagd`);
} else {
  console.log(`❌ ${failed} test(s) mislukt, ${passed} geslaagd`);
  process.exit(1);
}
