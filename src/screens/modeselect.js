// Topografie Quiz — mode-select scherm (#96 increment 2).
//
// Toont het tussenscherm tussen level-keuze en quiz: titel van de gekozen set,
// paper-card met MC/Typ/Klik-op-kaart-knoppen, en set-specifieke uitleg per
// modus (polygon vs. point, phased vs. simple, province vs. water vs. country).
//
// Deze module doet alleen view-werk: visibility-class, tekst-injectie, en het
// al-dan-niet tonen van de kaart-klik-knop. Kaartlaag-cleanup (markers,
// polygonen, highlightMarker-reassignment) blijft in de wrapper in index.html
// omdat die bindings daar in closure-scope leven.

export function renderModeSelect(setNumber, { SETS, applyVisibility }) {
  applyVisibility('mode-select');
  document.querySelector('h1').textContent = '🗺️ Topografie Quiz';
  // #114: mode-select in Routekaart-stijl — zand-bg + plain title-bar.
  // on-home af (dan krijgt title-bar ook de nieuwe plain-look).
  document.body.classList.remove('on-home');
  document.body.classList.remove('on-end');
  document.body.classList.add('on-mode-select');

  document.getElementById('start-level-name').textContent = `🗺️ ${SETS[setNumber].name}`;

  const _msSet = SETS[setNumber];
  const descs = document.querySelectorAll('#mode-select .mode-desc');
  if (_msSet.kind === 'phased') {
    // Gefaseerde set: generieke beschrijvingen (meerdere typen elementen)
    const labels = _msSet.phases.map(p => p.label).join(', ');
    descs[0].textContent = `Dit level bevat meerdere categorieën (${labels}). Je ziet steeds één element op de kaart en kiest de naam. Goed om te beginnen!`;
    descs[1].textContent = `Je typt de naam van elk element zelf in. Hints beschikbaar. Categorieën: ${labels}.`;
    document.getElementById('map-mode-btn').style.display = '';
    if (descs[2]) descs[2].textContent = `Je klikt op de kaart waar het gevraagde element ligt. Hoe dichter bij, hoe beter!`;
  } else {
    const isProvince = _msSet.quizType === 'province';
    const isWater    = _msSet.quizType === 'water';
    const isCountry  = _msSet.quizType === 'country';
    descs[0].textContent = isProvince
      ? 'Je ziet een provincie gekleurd op de kaart en kiest de juiste naam uit vier opties. Goed om te beginnen!'
      : isWater
      ? 'Je ziet een waterweg gekleurd op de kaart en kiest de juiste naam uit vier opties. Goed om te beginnen!'
      : isCountry
      ? 'Je ziet een land gekleurd op de kaart en kiest de juiste naam uit vier opties. Goed om te beginnen!'
      : 'Je ziet een stip op de kaart en kiest de juiste naam uit vier opties. Goed om te beginnen!';
    descs[1].textContent = isProvince
      ? 'Je typt de naam van de provincie zelf in. Ook de spelling telt — net als op de echte toets!'
      : isWater
      ? 'Je typt de naam van de waterweg zelf in. Ook de spelling telt — net als op de echte toets! Hints beschikbaar.'
      : isCountry
      ? 'Je typt de naam van het land zelf in. Ook de spelling telt — net als op de echte toets! Hints beschikbaar.'
      : 'Je typt de naam van de plaats zelf in. Ook de spelling telt — net als op de echte toets! Hints beschikbaar.';
    // Kaart-klik niet beschikbaar voor provincies; wel voor plaatsen, wateren en landen
    document.getElementById('map-mode-btn').style.display = isProvince ? 'none' : '';
    if (descs[2]) descs[2].textContent = isWater
      ? 'Je ziet de naam van een waterweg en klikt op de kaart waar die ligt. Hoe dichter bij, hoe beter!'
      : isCountry
      ? 'Je ziet de naam van een land en klikt op de kaart waar dat land ligt. Klik ín het land voor een perfect antwoord!'
      : 'Je ziet de naam van een plaats en klikt op de kaart waar die ligt. Hoe dichter bij, hoe beter!';
  }
}
