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

// Regressie: bij elke nieuwe vraag moet de kaart op het set.bounds-overzicht
// blijven. Een per-vraag fitBounds op de country-polygon zoomt te ver in
// (kleine landen zoals Luxemburg → zoom 10+), waardoor de gebruiker geen
// randen van het land in beeld heeft. Overzicht is de enige zinnige view
// voor een "Welk land is dit?"-vraag: het kleur-highlight wijst het land
// aan, context rondom is nodig om het te herkennen.
test('set 58 — fase 1: zoom blijft op overzicht na vraag-wissel', async ({ page }) => {
  await startSet58MC(page);
  // Wacht even op initial rendering + rAF-override
  await page.waitForTimeout(500);
  const zoomBefore = await page.evaluate(() => map.getZoom());
  // Initial fit moet overzicht zijn (maxZoom: 8 op _set.bounds)
  expect(zoomBefore).toBeLessThanOrEqual(7);

  // Beantwoord vraag 1 — hoeft niet goed, alleen volgende vraag triggeren.
  // Na MC-klik zet het spel 2s later zelf de volgende vraag (setTimeout).
  await page.locator('.opt').first().click();
  await page.waitForTimeout(2500);
  const zoomAfter = await page.evaluate(() => map.getZoom());

  // Zoom moet binnen 1 level van de start-zoom blijven — niet uitschieten
  // naar de per-country-fit (cap 12).
  expect(Math.abs(zoomAfter - zoomBefore)).toBeLessThanOrEqual(1);
  expect(zoomAfter).toBeLessThanOrEqual(7);
});
