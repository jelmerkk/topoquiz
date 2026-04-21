/**
 * Set 72 — België en Luxemburg (issue #41)
 *
 * Common smoke-tests (menu-visible, mode-select, fase-1 vraag/label/qtot/zoom)
 * zitten in tests/set-smoke.spec.js. Hier alleen set-specifieke regressies.
 */

const { test, expect } = require('@playwright/test');
const { waitForPolygonLayer } = require('./helpers');

test('set 72 — Luxemburg-polygoon is de OSM-grens (>100 punten), niet de 7-punts landen-versie', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'België' }).click();
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#qtot');
  await waitForPolygonLayer(page, 'province', 'Luxemburg');
  const pts = await page.evaluate(() =>
    polygonTypes.province.layers.Luxemburg.getLatLngs()[0].length
  );
  expect(pts).toBeGreaterThan(100);
});
