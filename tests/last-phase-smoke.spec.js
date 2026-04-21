/**
 * Last-phase smoke — regressie-net voor #93 SETS refactor.
 *
 * set-smoke.spec dekt alleen fase 1. De Zwarte Zee bug (fase 4 render-miss
 * in set 7.7) liet zien hoe makkelijk een late-fase regressie onopgemerkt
 * blijft. Deze spec deep-linkt elke phased set zonder late-fase-spec naar
 * de laatste fase en verifieert: question-text zichtbaar, juiste polygon-
 * layer gebouwd, correct antwoord advanced (geen JS-error).
 *
 * Sets met eigen late-fase spec zijn uitgesloten:
 *   73 (fase 2/3), 74 (fase 2), 75, 77 (fase 4), 89 (fase 3)
 */

const { test, expect } = require('@playwright/test');

// phaseCount komt uit test.js's SETS_BEHAVIOR_SNAPSHOT — synced handmatig
// houden (bij nieuwe set of phase-count-wijziging ook hier aanpassen).
const LAST_PHASE = {
  58: { phase: 1, quizType: 'place' },
  71: { phase: 1, quizType: 'place' },
  72: { phase: 2, quizType: 'water' },
  76: { phase: 2, quizType: 'water' },
  78: { phase: 3, quizType: 'water' },
  79: { phase: 3, quizType: 'water' },
  81: { phase: 3, quizType: 'water' },
  82: { phase: 3, quizType: 'water' },
  83: { phase: 3, quizType: 'water' },
  84: { phase: 2, quizType: 'water' },
  85: { phase: 3, quizType: 'water' },
  86: { phase: 3, quizType: 'water' },
  87: { phase: 3, quizType: 'water' },
  88: { phase: 3, quizType: 'water' },
};

for (const [n, { phase, quizType }] of Object.entries(LAST_PHASE)) {
  test(`set ${n} — last phase (${quizType}) deep-link, render, answer correctly`, async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', e => jsErrors.push(e.message));

    await page.goto(`/?set=${n}&mode=mc&phase=${phase}`);
    await page.waitForSelector('#question-text:visible');

    // De juiste polygon-layer moet gebouwd zijn (behalve 'place': marker-only).
    if (quizType !== 'place') {
      await page.waitForFunction(
        qt => polygonTypes[qt]?.layersBuilt === true,
        quizType,
        { timeout: 10000 }
      );
    }

    // Verifieer dat activeCities het juiste quizType bevat.
    const info = await page.evaluate(() => ({
      currentName: currentCity?.name ?? null,
      quizType: typeof currentQuizType === 'function' ? currentQuizType() : null,
      activeCount: activeCities?.length ?? 0,
    }));
    expect(info.currentName).toBeTruthy();
    expect(info.quizType).toBe(quizType);
    expect(info.activeCount).toBeGreaterThan(0);

    // Beantwoord correct — verifieer dat er geen JS-error optreedt en de
    // UI advanced (opties-state resetten of phase-transitie / end-screen).
    await page.locator('.opt', { hasText: info.currentName }).first().click();
    await page.waitForFunction(() => {
      if (document.getElementById('end-screen')?.offsetParent !== null) return true;
      const pt = document.getElementById('phase-transition');
      if (pt && getComputedStyle(pt).display !== 'none') return true;
      const opts = document.querySelectorAll('.opt');
      return opts.length > 0 && !opts[0].disabled;
    }, { timeout: 10000 });

    expect(jsErrors, `JS errors: ${jsErrors.join(' | ')}`).toEqual([]);
  });
}
