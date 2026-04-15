/**
 * Set 71 — Landen en hoofdsteden (issue #40)
 *
 * Fase 1: 20 Europese landen (country quizType)
 * Fase 2: 20 hoofdsteden (place quizType)
 *
 * Infrastructuur (faseovergang, polygoonrendering, qtot) is al gedekt
 * via set 73's tests. Hier: data-correctheid + UI-smoke.
 */

const { test, expect } = require('@playwright/test');
const { waitForPolygonLayer, waitForMapClickReady } = require('./helpers');

async function openSet71(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'Landen en hoofdsteden' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startSet71(page) {
  await openSet71(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

// ── Set-definitie & navigatie ──────────────────────────────────────────────────

test('set 71 verschijnt in groep 7', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Landen en hoofdsteden' })).toBeVisible();
});

test('set 71 — mode-select bereikbaar', async ({ page }) => {
  await openSet71(page);
  await expect(page.locator('#mode-select')).toBeVisible();
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
  const hasLayer = await page.evaluate(() => polygonTypes.country.quizLayer !== null);
  expect(hasLayer).toBe(true);
});

test('set 71 — fase 1: MC heeft 4 opties', async ({ page }) => {
  await startSet71(page);
  await expect(page.locator('.opt')).toHaveCount(4);
});

// Regressie: bij een correct antwoord in klik-op-kaart voor quizType 'country'
// werd eerder een groene 'stad'-stip op de centroïde van het land geplaatst
// (revealedLayer). Dat was verwarrend omdat het polygoon al als mastered kleurt.
test('set 71 — fase 1 klik-op-kaart: correct land voegt geen stip toe aan revealedLayer', async ({ page }) => {
  await openSet71(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Klik' }).click();
  await page.waitForSelector('#question-text');
  await waitForPolygonLayer(page, 'country');
  await waitForMapClickReady(page);
  // Klik op de centroïde van het actieve land (binnen polygoon = 0 km = correct)
  await page.evaluate(() => {
    map.fire('click', { latlng: L.latLng(currentCity.lat, currentCity.lon) });
  });
  await expect(page.locator('#feedback')).toHaveClass(/fb-ok/);
  const revealedCount = await page.evaluate(() => revealedLayer.getLayers().length);
  expect(revealedCount).toBe(0);
});
