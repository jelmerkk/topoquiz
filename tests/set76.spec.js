/**
 * Set 76 — Midden-Europa en Italië (issue #45)
 *
 * Common smoke-tests (menu-visible, mode-select, fase-1 vraag/label/qtot/zoom)
 * zitten in tests/set-smoke.spec.js. Hier alleen set-specifieke regressies.
 */

const { test, expect } = require('@playwright/test');

test('set 76 — Donau is een LineString', async ({ page }) => {
  await page.goto('/');
  const bounds = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const donau = data.features.find(f => f.properties.name === 'Donau');
    if (!donau || donau.geometry.type !== 'LineString') return null;
    const lats = donau.geometry.coordinates.map(c => c[1]);
    return {
      minLat: Math.min(...lats), maxLat: Math.max(...lats),
      len: donau.geometry.coordinates.length,
    };
  });
  expect(bounds).not.toBeNull();
  // Donau loopt door Duitsland, Oostenrijk, Hongarije → breed latbereik
  expect(bounds.minLat).toBeLessThan(45);
  expect(bounds.maxLat).toBeGreaterThan(48);
  expect(bounds.len).toBeGreaterThan(50);
});

test('set 76 — Sicilië is een polygoon in gewesten.geojson', async ({ page }) => {
  await page.goto('/');
  const found = await page.evaluate(async () => {
    const data = await fetch('/gewesten.geojson').then(r => r.json());
    const sic = data.features.find(f => f.properties.name === 'Sicilië');
    if (!sic) return null;
    const pts = sic.geometry.type === 'MultiPolygon'
      ? sic.geometry.coordinates.reduce((s, p) => s + p[0].length, 0)
      : sic.geometry.coordinates[0].length;
    return { type: sic.geometry.type, pts };
  });
  expect(found).not.toBeNull();
  expect(found.pts).toBeGreaterThan(20);
});
