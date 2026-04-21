/**
 * Set 74 — Duitsland (issue #43)
 *
 * Data-assertions (Rijn/Elbe/Moezel LineString) zijn gemigreerd naar test.js.
 * Alleen de UI-regressietest voor fase 2 klik-op-kaart blijft hier staan.
 */

const { test, expect } = require('@playwright/test');
const { waitForPolygonLayer } = require('./helpers');

async function openSet74(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'Duitsland' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

// Regressie: bij een correct antwoord in klik-op-kaart voor quizType 'province'
// (gewest/regio) werd eerder een groene stip op de centroïde toegevoegd aan
// revealedLayer. Dat is verwarrend omdat het polygoon al als mastered kleurt.
test("set 74 — fase 2 klik-op-kaart: correct regio voegt geen stip toe aan revealedLayer", async ({ page }) => {
  await openSet74(page);
  // Spring direct naar fase 2 (regio's) via de startPhase-parameter van startQuiz().
  await page.evaluate(() => { selectedSet = 74; startQuiz('map', 1); });
  await page.waitForSelector('#question-text');
  await waitForPolygonLayer(page, 'province');
  await page.waitForFunction(() => {
    const listeners = map._events?.click;
    return Array.isArray(listeners) && listeners.length > 0;
  });
  // Klik op de centroïde van de actieve regio (binnen fuzzy ellipse = 0 km = correct)
  await page.evaluate(() => {
    map.fire('click', { latlng: L.latLng(currentCity.lat, currentCity.lon) });
  });
  await expect(page.locator('#feedback')).toHaveClass(/fb-ok/);
  const revealedCount = await page.evaluate(() => revealedLayer.getLayers().length);
  expect(revealedCount).toBe(0);
});
