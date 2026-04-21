/**
 * Set 79 — Zuidoost-Europa (issue #48)
 *
 * Common smoke-tests (menu-visible, mode-select, fase-1 vraag/label/qtot/zoom)
 * zitten in tests/set-smoke.spec.js. Hier alleen set-specifieke regressies.
 */

const { test, expect } = require('@playwright/test');

test('set 79 — Griekenland bestaat in landen-europa.geojson met set 79', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/landen-europa.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Griekenland');
    return f ? { sets: f.properties.sets, type: f.geometry.type } : null;
  });
  expect(info).not.toBeNull();
  expect(info.sets).toContain(79);
});

test('set 79 — Kreta polygon staat in gewesten.geojson', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/gewesten.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Kreta');
    if (!f) return null;
    const coords = f.geometry.coordinates[0];
    const lats = coords.map(c => c[1]), lons = coords.map(c => c[0]);
    return { minLat: Math.min(...lats), maxLat: Math.max(...lats),
             minLon: Math.min(...lons), maxLon: Math.max(...lons),
             sets: f.properties.sets };
  });
  expect(info).not.toBeNull();
  expect(info.sets).toContain(79);
  // Kreta ligt grofweg tussen 34.8°-35.7°N en 23.5°-26.3°E
  expect(info.minLat).toBeGreaterThan(34.5);
  expect(info.maxLat).toBeLessThan(36);
  expect(info.minLon).toBeGreaterThan(23);
  expect(info.maxLon).toBeLessThan(27);
});

test('set 79 — Bosporus polygoon ligt nabij Istanbul (~41°N, ~29°E)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const b = data.features.find(f => f.properties.name === 'Bosporus');
    if (!b) return null;
    const coords = b.geometry.coordinates[0];
    const lats = coords.map(c => c[1]), lons = coords.map(c => c[0]);
    return { cy: (Math.min(...lats) + Math.max(...lats))/2,
             cx: (Math.min(...lons) + Math.max(...lons))/2 };
  });
  expect(info).not.toBeNull();
  expect(info.cy).toBeGreaterThan(40.8);
  expect(info.cy).toBeLessThan(41.4);
  expect(info.cx).toBeGreaterThan(28.8);
  expect(info.cx).toBeLessThan(29.4);
});
