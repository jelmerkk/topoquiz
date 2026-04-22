// Topografie Quiz — eindscherm (#96 increment 4).
//
// Toont het end-screen na het laatste masterede item: tekst met score,
// sterren (1/2/3 op basis van fouten), rating-widget of — voor daily —
// emoji-grid + share-knop.
//
// Dit is een puur view-functie. Alle state-mutaties (quizStartTime reset,
// clearSavedProgress, localStorage-schrijf voor daily emoji, _trackQuiz)
// gebeuren in de wrapper (showEnd in index.html) zodat de module zelf
// niets muteerbaars aanraakt.
//
// Input is een pre-berekende ctx met alles wat op het scherm moet komen.

export function renderEnd({
  set, activeCities, total, pct, cumulativeOk, cumulativeErr,
  isDaily, correctDaily, emojiDaily,
  applyVisibility,
}) {
  applyVisibility('end');
  // #102: body.on-end → zand-bg + plain title-bar op end-scherm.
  document.body.classList.remove('on-home');
  document.body.classList.remove('on-mode-select');
  document.body.classList.add('on-end');

  const _endIsMixed  = set.kind === 'dailyBonus';
  const _endIsPhased = set.kind === 'phased';
  const _endIsSimple = set.kind === 'simple';
  const isProvince = _endIsSimple && set.quizType === 'province';
  const isWater    = _endIsSimple && set.quizType === 'water';

  if (isDaily) {
    // Wording neutraal — daily bevat niet meer alléén steden (issue #80).
    document.getElementById('end-text').innerHTML =
      `<strong>${correctDaily} van de ${activeCities.length}</strong> meteen goed geraden! 🗺️`;
    document.getElementById('daily-emoji').textContent = emojiDaily;
    document.getElementById('daily-share-wrap').style.display = 'block';
    document.getElementById('rating-wrap').style.display = 'none';
    document.getElementById('end-stars').style.display = 'none';
    return;
  }

  document.getElementById('daily-share-wrap').style.display = 'none';
  document.getElementById('rating-wrap').style.display = '';
  document.getElementById('end-stars').style.display = '';
  document.getElementById('end-text').innerHTML =
    _endIsMixed
      ? `Je hebt alle <strong>${activeCities.length} items</strong> in de bonus gespeeld! 🗺️<br>Je had ${cumulativeOk} van de ${total} goed — ${pct}% raak! 🎯`
      : _endIsPhased
      ? `Je hebt alle fases van <strong>${set.name}</strong> voltooid! 🗺️<br>Je had ${cumulativeOk} van de ${total} goed — ${pct}% raak! 🎯`
      : `Je kent nu alle <strong>${activeCities.length} ${isProvince ? 'provincies' : isWater ? 'wateren' : 'plaatsen'}</strong>! 🗺️<br>Je had ${cumulativeOk} van de ${total} goed — ${pct}% raak! 🎯`;

  // Sterren: 3 = geen fouten, 2 = ≥80%, 1 = altijd
  const stars = cumulativeErr === 0 ? 3 : pct >= 80 ? 2 : 1;
  const starsEl = document.getElementById('end-stars');
  starsEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.textContent = i < stars ? '⭐' : '☆';
    s.style.animationDelay = `${i * 250}ms`;
    s.style.animation = `star-pop 0.5s ease-out ${i * 250}ms forwards`;
    starsEl.appendChild(s);
  }
  // Reset rating widget
  document.getElementById('rating-btns').style.display    = 'flex';
  document.getElementById('rating-question').style.display = 'block';
  document.getElementById('rating-thanks').style.display   = 'none';
}
