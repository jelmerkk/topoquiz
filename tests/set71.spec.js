/**
 * Set 71 — Landen van Europa (issue #40)
 *
 * Fase 1: 20 Europese landen (country quizType)
 * Fase 2: 20 hoofdsteden (place quizType)
 *
 * Alle tests zijn BEWUST ROOD totdat set 71 geïmplementeerd is.
 */

const { test, expect } = require('@playwright/test');

const LANDEN = [
  'Portugal', 'Spanje', 'Frankrijk', 'België', 'Nederland', 'Luxemburg',
  'Verenigd Koninkrijk', 'Ierland', 'IJsland', 'Duitsland', 'Denemarken',
  'Noorwegen', 'Zweden', 'Finland', 'Oostenrijk', 'Zwitserland',
  'Italië', 'Polen', 'Tsjechië', 'Hongarije',
];

const HOOFDSTEDEN = [
  'Lissabon', 'Madrid', 'Parijs', 'Brussel', 'Amsterdam', 'Luxemburg',
  'Londen', 'Dublin', 'Reykjavík', 'Berlijn', 'Kopenhagen',
  'Oslo', 'Stockholm', 'Helsinki', 'Wenen', 'Bern',
  'Rome', 'Warschau', 'Praag', 'Boedapest',
];

async function openSet71(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'Landen van Europa' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startSet71(page) {
  await openSet71(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

// ── Set-definitie ──────────────────────────────────────────────────────────────

test('set 71 verschijnt in groep 7', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Landen van Europa' })).toBeVisible();
});

// ── Fase 1: landen ─────────────────────────────────────────────────────────────

test('set 71 — fase 1: vraag is "Welk land is dit?"', async ({ page }) => {
  await startSet71(page);
  await expect(page.locator('#question-text')).toHaveText('Welk land is dit?');
});

test('set 71 — fase 1: faseslabel toont "Landen"', async ({ page }) => {
  await startSet71(page);
  await expect(page.locator('#phase-label')).toContainText('Landen');
});

test('set 71 — fase 1: #qtot toont 20', async ({ page }) => {
  await startSet71(page);
  const tot = await page.locator('#qtot').textContent();
  expect(Number(tot)).toBe(20);
});

test('set 71 — fase 1: landpolygoon zichtbaar op kaart', async ({ page }) => {
  await startSet71(page);
  const hasLayer = await page.evaluate(() => countryQuizLayer !== null);
  expect(hasLayer).toBe(true);
});

test('set 71 — fase 1: MC heeft 4 opties', async ({ page }) => {
  await startSet71(page);
  await expect(page.locator('.opt')).toHaveCount(4);
});

// ── Fase 2: hoofdsteden ────────────────────────────────────────────────────────

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

async function waitForPhaseStart(page) {
  await page.waitForFunction(() => {
    const t = document.getElementById('phase-transition');
    if (t && getComputedStyle(t).display !== 'none') return false;
    const opts = document.querySelectorAll('.opt');
    return opts.length > 0 && !opts[0].disabled;
  }, { timeout: 15000 });
}

test('set 71 — na fase 1: transitiescherm toont "Landen"', async ({ page }) => {
  test.setTimeout(120_000);
  await startSet71(page);
  // mastery=3 standaard → 3× per land; 20 landen = max 60 antwoorden
  // maar spaced rep kan eerder klaarmaken; loop tot transitie
  for (let i = 0; i < 60; i++) {
    const ended = await page.evaluate(() =>
      document.getElementById('end-screen')?.offsetParent !== null ||
      (getComputedStyle(document.getElementById('phase-transition') || {}).display !== 'none')
    );
    if (ended) break;
    await answerMCCorrectly(page);
  }
  await expect(page.locator('#phase-transition')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#phase-transition')).toContainText('Landen');
});

test('set 71 — fase 2: vraag is "Welke plaats is dit?"', async ({ page }) => {
  test.setTimeout(120_000);
  await startSet71(page);
  for (let i = 0; i < 60; i++) {
    const ended = await page.evaluate(() =>
      document.getElementById('end-screen')?.offsetParent !== null ||
      (getComputedStyle(document.getElementById('phase-transition') || {}).display !== 'none')
    );
    if (ended) break;
    await answerMCCorrectly(page);
  }
  await expect(page.locator('#phase-transition')).toBeVisible({ timeout: 5000 });
  await page.waitForFunction(() => {
    const t = document.getElementById('phase-transition');
    return !t || getComputedStyle(t).display === 'none';
  }, { timeout: 8000 });
  await expect(page.locator('#question-text')).toHaveText('Welke plaats is dit?', { timeout: 5000 });
  await expect(page.locator('#phase-label')).toContainText('Hoofdsteden');
});
