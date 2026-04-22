// Topografie Quiz — klik-op-de-kaart resultaatbepaling (#95)
//
// clickResult(distKm, set?)  → 'correct' | 'close' | 'wrong'
//   distKm : afstand (in km) van het klikpunt tot het correcte item
//   set    : optioneel set-config — {clickCorrectKm?, clickCloseKm?}
//            (typisch SETS[selectedSet]). Zonder set of velden gelden
//            de defaults (20 km / 60 km) die historisch voor NL-sets
//            golden. EU- en wereldsets zetten expliciet hogere drempels
//            in cities.js (factory-velden van `simpleSet`/`phasedSet`).
//
// Pure functie; geen globals, geen SETS-lookup. De caller beslist welke
// set-config relevant is.

const CLICK_CORRECT_KM = 20;
const CLICK_CLOSE_KM   = 60;

export function clickResult(distKm, set) {
  const cfg = set || {};
  const correctKm = cfg.clickCorrectKm ?? CLICK_CORRECT_KM;
  const closeKm   = cfg.clickCloseKm   ?? CLICK_CLOSE_KM;
  if (distKm < correctKm) return 'correct';
  if (distKm < closeKm)   return 'close';
  return 'wrong';
}
