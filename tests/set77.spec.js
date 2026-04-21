/**
 * Set 77 — Oost-Europa (issue: Zwarte Zee rendert niet in fase 4)
 *
 * Regressie: ensureShapeFeatures() verving de Zwarte Zee polygon-feature
 * (sets:[77,79]) by-name door de fuzzy ellips-variant (sets:[84]) uit
 * ALL_WATERS, waarna buildPolygonLayer's set-filter het item eruit gooide.
 * Fix: inject fuzzy/peak features alleen als activeCities een bijpassend
 * item heeft met dezelfde shape.
 */

const { test, expect } = require('@playwright/test');

test('set 77 fase 4 (wateren): Zwarte Zee-polygon wordt gerenderd', async ({ page }) => {
  await page.goto('/?set=77&mode=mc&phase=3');
  await page.waitForSelector('#question-text:visible');
  // Wacht tot wateren-fase opgebouwd is.
  await page.waitForFunction(() => polygonTypes.water.layersBuilt === true, null, { timeout: 10000 });
  const layerNames = await page.evaluate(() => Object.keys(polygonTypes.water.layers));
  expect(layerNames).toContain('Zwarte Zee');
  // Het moet de polygon-variant zijn, niet de fuzzy ellips.
  const shape = await page.evaluate(() =>
    polygonTypes.water.layers['Zwarte Zee']?.feature?.properties?.shape || null
  );
  expect(shape).not.toBe('fuzzy');
});
