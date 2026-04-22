// Topografie Quiz — Daily Challenge + Bonus pool-builders (#80, #95)
//
// Pure functies voor de datum-geseede dagelijkse uitdaging (set 98) en
// de per-sessie bonus (set 99). Data (ALL_CITIES, SETS, DAILY_FORMAT, …)
// komt via een `data`-parameter — geen module-level globals, zodat
// test.mjs én index.html dezelfde implementatie delen met hun eigen
// dataset-binding.
//
//   makeRng(seed)                     → RNG-functie; reproducible per seed
//   dateSeed(dateStr, group?)         → int-seed uit 'YYYY-MM-DD' (+ group-hash)
//   seededShuffle(arr, rng)           → nieuwe array, Fisher-Yates via rng
//   polygonTypeFor(itemType)          → 'country' | 'water' | 'province' | null
//   poolForType(type, group, data)    → items van `type` binnen `group`
//   buildMixedPool(fmt, group, rng,   → mixed-type pool volgens DAILY/BONUS_FORMAT
//                  data)
//   dailyPool(dateStr, group, data)   → datum-deterministische daily-pool
//   buildBonusPool(group, data)       → niet-deterministische bonus-pool
//                                       (gebruikt Math.random)
//   dailyCities(dateStr, ALL_CITIES)  → legacy-shim (pre-#80). Niet meer actief
//                                       gebruikt; laat bestaan voor oude keys.
//   dailyResultEmoji(results)         → '🟢🔴🟢…'-string

export function makeRng(seed) {
  let s = seed;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ s >>> 15, s | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function dateSeed(dateStr, group) {
  const dNum = dateStr.split('-').reduce((acc, n) => acc * 10000 + parseInt(n, 10), 0);
  if (group == null) return dNum;
  // Multiplicatie met priem + group zorgt voor stabiele maar verschillende
  // seeds per groep op dezelfde dag (issue #80).
  return (dNum * 31 + Number(group)) | 0;
}

export function seededShuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// _itemType → polygonTypes-key (null voor steden = markers i.p.v. polygonen).
export function polygonTypeFor(itemType) {
  if (itemType === 'country') return 'country';
  if (itemType === 'water')   return 'water';
  if (itemType === 'region')  return 'province';
  return null;
}

// Pool van alle items van een bepaald type binnen de geselecteerde groep.
// `data` moet { ALL_CITIES, ALL_COUNTRIES, ALL_WATERS, ALL_PROVINCES, SETS } bevatten.
export function poolForType(type, group, data) {
  const { ALL_CITIES, ALL_COUNTRIES, ALL_WATERS, ALL_PROVINCES, SETS } = data;
  const inGroup = item => item.sets?.some(s => SETS[s]?.group === group);
  if (type === 'place')   return ALL_CITIES.filter(inGroup);
  if (type === 'country') return ALL_COUNTRIES.filter(inGroup);
  if (type === 'water')   return ALL_WATERS.filter(inGroup);
  if (type === 'region')  return ALL_PROVINCES.filter(inGroup);
  return [];
}

// Bouw een heterogene pool volgens een format-specificatie. Elk item krijgt
// ._itemType zodat currentQuizType/distractorPool/renderQuestion weten welk
// type ze bekijken. Volgorde wordt daarna doorgeshuffled zodat de types door
// elkaar lopen tijdens het spelen.
export function buildMixedPool(fmt, group, rng, data) {
  const out = [];
  // Dedupeer over types heen op naam — streak[c.name] en andere maps gebruiken
  // alleen naam als key. Groep 8 kan bv. "Panama" als land én stad hebben.
  const usedNames = new Set();
  for (const { type, count } of fmt) {
    const pool = poolForType(type, group, data).filter(p => !usedNames.has(p.name));
    const picks = seededShuffle(pool, rng).slice(0, count);
    for (const it of picks) { it._itemType = type; out.push(it); usedNames.add(it.name); }
  }
  return seededShuffle(out, rng);
}

// Datum-deterministische daily-pool. `data` moet ook DAILY_FORMAT bevatten.
export function dailyPool(dateStr, group, data) {
  const fmt = data.DAILY_FORMAT[group];
  if (!fmt) return [];
  return buildMixedPool(fmt, group, makeRng(dateSeed(dateStr, group)), data);
}

// Niet-deterministische bonus-pool (nieuwe mix per klik). `data` moet ook
// BONUS_FORMAT bevatten.
export function buildBonusPool(group, data) {
  const fmt = data.BONUS_FORMAT[group];
  if (!fmt) return [];
  return buildMixedPool(fmt, group, makeRng((Math.random() * 0x7fffffff) | 0), data);
}

// Legacy shim (pre-#80): 10 steden uit ALL_CITIES, datum-geseed. Niet meer
// actief aangeroepen, maar laten bestaan zodat oude sessionStorage-entries
// niet breken wanneer een gebruiker een oude snapshot opent.
export function dailyCities(dateStr, ALL_CITIES) {
  const rng = makeRng(dateSeed(dateStr));
  return seededShuffle(ALL_CITIES, rng).slice(0, 10);
}

export function dailyResultEmoji(results) {
  return results.map(r => r ? '🟢' : '🔴').join('');
}
