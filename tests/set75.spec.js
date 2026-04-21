/**
 * Set 75 — VK en Ierland (issue #44)
 *
 * Data-assertions (Theems LineString) zijn gemigreerd naar test.js. Hier
 * blijven de polygonTypes- en country-laag-regressietests: die lezen de
 * runtime-laag in Leaflet, dus Playwright is vereist.
 */

const { test, expect } = require('@playwright/test');
const { waitForPolygonLayer } = require('./helpers');

async function openSet75(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'Verenigd Koninkrijk' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startSet75MC(page) {
  await openSet75(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

// Regio-polygonen moeten uit OSM komen (real polygons, niet fuzzy ellipse).
// Luxemburg-bug had 7 punten; hard-grens zou er tientallen tot honderden moeten hebben.
test('set 75 — Ierland is een harde polygoon met veel punten', async ({ page }) => {
  await startSet75MC(page);
  await waitForPolygonLayer(page, 'province', 'Ierland');
  const pts = await page.evaluate(() => {
    const flat = (x) => Array.isArray(x) ? x.flatMap(flat) : [x];
    return flat(polygonTypes.province.layers.Ierland.getLatLngs()).length;
  });
  expect(pts).toBeGreaterThan(100);
});

// Schotland is een MultiPolygon: vasteland + Shetland + Orkney + Hebriden.
// De Shetland-ring bevat lat > 60 (Lerwick ≈ 60.15°N).
test('set 75 — Schotland bevat Shetland (noordelijke lat > 60)', async ({ page }) => {
  await startSet75MC(page);
  await waitForPolygonLayer(page, 'province', 'Schotland');
  const { maxLat, ringCount } = await page.evaluate(() => {
    const layer = polygonTypes.province.layers.Schotland;
    const geom = layer.feature.geometry;
    const ringCount = geom.type === 'MultiPolygon' ? geom.coordinates.length : 1;
    const flat = (x) => Array.isArray(x) ? x.flatMap(flat) : [x];
    const pts = flat(layer.getLatLngs());
    return { maxLat: Math.max(...pts.map(p => p.lat)), ringCount };
  });
  expect(ringCount).toBeGreaterThanOrEqual(2);
  expect(maxLat).toBeGreaterThan(60);
});

// Schotland MultiPolygon mag geen kunstmatige "brug"-lijnen hebben tussen
// eilanden en vasteland. Check: er is geen ring die zowel een Shetland-punt
// (lat > 60) als een vasteland-punt (lat < 57) bevat.
test('set 75 — Schotland heeft geen artefact-brug tussen eilanden en vasteland', async ({ page }) => {
  await startSet75MC(page);
  await waitForPolygonLayer(page, 'province', 'Schotland');
  const hasBridge = await page.evaluate(() => {
    const geom = polygonTypes.province.layers.Schotland.feature.geometry;
    const rings = geom.type === 'MultiPolygon'
      ? geom.coordinates.map(poly => poly[0])
      : [geom.coordinates[0]];
    return rings.some(ring => {
      const lats = ring.map(c => c[1]);
      return Math.max(...lats) > 59.5 && Math.min(...lats) < 57;
    });
  });
  expect(hasBridge).toBe(false);
});

// Set 7.1 moet onverstoord de hele UK als land blijven tekenen.
// Als per ongeluk de gewesten-polygonen in de country-laag terechtkomen
// (door naam-collision), zou deze test falen.
test('set 75 regio\'s zijn niet in de country-laag (geen conflict met set 7.1)', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => polygonTypes?.country?.featureData);
  const countryNames = await page.evaluate(() =>
    polygonTypes.country.featureData.features.map(f => f.properties.name || f.properties.NAME || f.properties.ADMIN)
  );
  // UK en Ierland moeten in de country-laag staan (voor set 7.1),
  // maar Engeland/Wales/Schotland/Noord-Ierland mogen er NIET in staan.
  expect(countryNames).not.toContain('Engeland');
  expect(countryNames).not.toContain('England');
  expect(countryNames).not.toContain('Wales');
  expect(countryNames).not.toContain('Schotland');
  expect(countryNames).not.toContain('Noord-Ierland');
});
