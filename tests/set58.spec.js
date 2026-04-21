/**
 * Set 58 — Onze buren (Geobas 5, hoofdstuk 8)
 *
 * Data-assertion (Slovenië polygon) is gemigreerd naar test.js. Alleen de
 * UI-regressietest voor de zichtbaarheid van de country-laag blijft hier.
 */

const { test, expect } = require('@playwright/test');

async function openSet58(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '5' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'Onze buren' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startSet58MC(page) {
  await openSet58(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

// Regressietest: polygonen moeten daadwerkelijk op de kaart verschijnen.
// Voorheen ontbraken sets-properties in landen-europa.geojson waardoor
// buildPolygonLayer alles filterde voor gefaseerde sets.
test('set 58 — fase 1: land-polygoon is zichtbaar op de kaart', async ({ page }) => {
  await startSet58MC(page);
  // Wacht tot country layers gebouwd zijn
  await page.waitForFunction(
    () => typeof polygonTypes !== 'undefined' &&
          polygonTypes.country?.layersBuilt &&
          Object.keys(polygonTypes.country.layers).length > 0,
    { timeout: 10000 }
  );
  const layerCount = await page.evaluate(() => Object.keys(polygonTypes.country.layers).length);
  expect(layerCount).toBeGreaterThanOrEqual(1);
});
