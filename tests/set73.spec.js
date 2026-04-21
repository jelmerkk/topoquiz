/**
 * Set 73 — Frankrijk, Spanje, Portugal (issue #42)
 *
 * Common smoke-tests (menu-visible, mode-select, fase-1 vraag/label/qtot/zoom)
 * zitten in tests/set-smoke.spec.js. Hier alleen set-specifieke regressies
 * (multi-fase doorloop).
 */

const { test, expect } = require('@playwright/test');

async function openSet73(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'Frankrijk' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startSet73MC(page) {
  await openSet73(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

async function answerMCCorrectly(page) {
  const name = await page.evaluate(() => currentCity.name);
  await page.locator('.opt', { hasText: name }).click();
  await page.waitForFunction(() => {
    if (document.getElementById('end-screen')?.offsetParent !== null) return true;
    const pt = document.getElementById('phase-transition');
    if (pt && getComputedStyle(pt).display !== 'none') return true;
    const opts = document.querySelectorAll('.opt');
    return opts.length > 0 && !opts[0].disabled;
  }, { timeout: 10000 });
}

// ── Fase 2: Gebieden ──────────────────────────────────────────────────────────

test('set 73 — na fase 1: gewesten-fase start met "Welk gebied is dit?"', async ({ page }) => {
  test.setTimeout(120_000);
  await startSet73MC(page);
  // Beantwoord alle steden-vragen correct
  let phase = await page.locator('#phase-label').textContent();
  while (phase.includes('Steden')) {
    await answerMCCorrectly(page);
    const ptVisible = await page.evaluate(() => {
      const t = document.getElementById('phase-transition');
      return t && getComputedStyle(t).display !== 'none';
    });
    if (ptVisible) break;
    phase = await page.locator('#phase-label').textContent();
  }
  // Wacht tot transitiescherm weg is en nieuwe fase begint
  await page.waitForFunction(() => {
    const t = document.getElementById('phase-transition');
    if (t && getComputedStyle(t).display !== 'none') return false;
    return document.querySelectorAll('.opt').length > 0;
  }, { timeout: 15000 });
  await expect(page.locator('#phase-label')).toContainText('Gebieden');
});

// ── Fase 3: Rivieren ──────────────────────────────────────────────────────────

test('set 73 — fase 3 label: "Rivieren"', async ({ page }) => {
  test.setTimeout(120_000);
  await startSet73MC(page);
  // Doorloop fases 1 en 2
  for (let fase = 0; fase < 2; fase++) {
    let phaseComplete = false;
    while (!phaseComplete) {
      await answerMCCorrectly(page);
      phaseComplete = await page.evaluate(() => {
        const t = document.getElementById('phase-transition');
        return t && getComputedStyle(t).display !== 'none';
      });
    }
    await page.waitForFunction(() => {
      const t = document.getElementById('phase-transition');
      if (t && getComputedStyle(t).display !== 'none') return false;
      return document.querySelectorAll('.opt').length > 0;
    }, { timeout: 15000 });
  }
  await expect(page.locator('#phase-label')).toContainText('Rivieren');
});
