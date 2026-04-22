// Topografie Quiz — level-select scherm (#96 increment 1).
//
// Bouwt het Home/level-select-scherm: header met XP-card (dummy), group-
// select-knoppen (5/6/7/8), de set-lijst gefilterd op geselecteerde groep,
// plus de install-PWA-knop. Het dom-werk staat in één `render()`; alle
// externe afhankelijkheden komen binnen via `deps`, zodat het module
// geen globalThis leest (behalve sessionStorage).
//
// Re-renders:
//   - group-btn wissel → render() opnieuw aanroepen (self-refresh via deps.rerender)
//   - selectLevel / handleInstall zijn callbacks uit index.html
//
// De visuele stijl zit in css/start.css (.home-header, .home-xp, .group-*,
// #level-select .mode-btn). Deze module genereert alleen markup + listeners.

export function renderLevelSelect({
  SETS, DAILY_FORMAT, BONUS_FORMAT,
  selectLevel, handleInstall, updateInstallButton,
  rerender,
}) {
  const el = document.getElementById('level-select');
  // Routekaart-refresh (#99): sky-gradient header + content-body in één render.
  // XP-bar is puur versiering; echte XP-logica komt in #104.
  // h2-tekst "Topografie Quiz" wordt door Playwright gecheckt (navigation.spec).
  el.innerHTML = `
    <div class="home-header">
      <div class="home-header-text">
        <h2 class="home-title"><span class="home-title-emoji" aria-hidden="true">🗺️ </span>Topografie Quiz</h2>
        <p class="home-subtitle">Oefen in je eigen tempo. Kies hieronder een quiz.</p>
      </div>
      <div class="home-xp" aria-hidden="true">
        <div class="home-xp-row"><span class="home-xp-label">NIVEAU 1</span><span>340 / 500</span></div>
        <div class="home-xp-bar"></div>
      </div>
    </div>
    <div class="home-body"></div>
  `;
  const body = el.querySelector('.home-body');

  // Groep-selectieknoppen
  const selectedGroup = (() => { try { return sessionStorage.getItem('selectedGroup'); } catch (_) { return null; } })();
  if (!selectedGroup) {
    const hint = document.createElement('p');
    hint.className = 'group-hint';
    hint.textContent = 'Kies je groep om te beginnen';
    body.appendChild(hint);
  }
  const groupWrap = document.createElement('div');
  groupWrap.className = 'group-select' + (!selectedGroup ? ' no-selection' : '');
  [5, 6, 7, 8].forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'group-btn' + (selectedGroup === String(g) ? ' active' : '');
    btn.textContent = `Groep ${g}`;
    btn.onclick = () => {
      try { sessionStorage.setItem('selectedGroup', String(g)); } catch (_) {}
      rerender();
    };
    groupWrap.appendChild(btn);
  });
  body.appendChild(groupWrap);

  Object.entries(SETS).forEach(([num, set]) => {
    // Daily/bonus (#80): toon alleen als er een format voor de gekozen groep is.
    if (set.kind === 'dailyBonus') {
      if (!selectedGroup) return;
      const g = Number(selectedGroup);
      const isDaily = set.variant === 'daily';
      const fmt = (isDaily ? DAILY_FORMAT : BONUS_FORMAT)[g];
      if (!fmt) return;
      const btn = document.createElement('button');
      btn.className = 'mode-btn ' + (isDaily ? 'daily-btn' : 'bonus-btn');
      btn.textContent = isDaily ? `📅 Uitdaging van vandaag` : `🎲 Bonus — door elkaar`;
      btn.onclick = () => selectLevel(Number(num));
      body.appendChild(btn);
      return;
    }
    // Toon alleen sets van de geselecteerde groep; zonder keuze: niets tonen
    if (!selectedGroup || set.group !== Number(selectedGroup)) return;
    const btn = document.createElement('button');
    btn.className = 'mode-btn';
    btn.textContent = set.name;
    if (set.beta) {
      const tag = document.createElement('span');
      tag.className = 'beta-label';
      tag.textContent = 'BETA';
      btn.appendChild(tag);
    }
    btn.onclick = () => selectLevel(Number(num));
    body.appendChild(btn);
  });
  // Installeerknop — BUITEN #level-select (= buiten de paper-card) in
  // #start-screen, zodat de PWA-meta-info visueel los staat van het
  // spelkader. Eerst evt. oude knop weghalen (re-renders).
  const startScreen = document.getElementById('start-screen');
  ['install-btn', 'install-tooltip'].forEach(id => {
    const prev = document.getElementById(id);
    if (prev && prev.parentNode === startScreen) prev.remove();
  });
  const installBtn = document.createElement('button');
  installBtn.id = 'install-btn';
  installBtn.textContent = '📲 Voeg toe aan beginscherm';
  installBtn.onclick = handleInstall;
  startScreen.appendChild(installBtn);
  const tooltip = document.createElement('div');
  tooltip.id = 'install-tooltip';
  startScreen.appendChild(tooltip);
  updateInstallButton();
  // level-select + mode-select panel-zichtbaarheid via applyVisibility('level-select')
  // (SCREEN_VISIBILITY zorgt dat level-select=block, mode-select=none).
}
