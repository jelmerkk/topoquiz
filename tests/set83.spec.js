/**
 * Set 83 — Noord- en Midden-Amerika (issue #51)
 *
 * Common smoke-tests (menu-visible, mode-select, fase-1 vraag/label/qtot/zoom)
 * zitten in tests/set-smoke.spec.js. Hier alleen set-specifieke regressies.
 */

const { test, expect } = require('@playwright/test');

test('set 83 — alle 7 landen in landen-noord-midden-amerika.geojson', async ({ page }) => {
  await page.goto('/');
  const names = await page.evaluate(async () => {
    const data = await fetch('/landen-noord-midden-amerika.geojson').then(r => r.json());
    return data.features.map(f => f.properties.name);
  });
  const expected = ['Canada','VS','Mexico','Cuba','Haïti','Guatemala','Nicaragua'];
  expected.forEach(n => expect(names).toContain(n));
});

test('set 83 — Alaska/Groenland/Texas/Florida als harde gewesten in gewesten.geojson', async ({ page }) => {
  await page.goto('/');
  const names = await page.evaluate(async () => {
    const data = await fetch('/gewesten.geojson').then(r => r.json());
    return data.features
      .filter(f => f.properties.sets?.includes(83))
      .map(f => f.properties.name);
  });
  ['Alaska','Groenland','Texas','Florida'].forEach(n => expect(names).toContain(n));
});

test('set 83 — Mississippi stroomt N→Z (Itasca → Golf)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Mississippi' && x.properties.sets?.includes(83));
    if (!f) return null;
    const c = f.geometry.coordinates;
    return { type: f.geometry.type, npts: c.length,
             startLat: c[0][1], endLat: c[c.length-1][1] };
  });
  expect(info).not.toBeNull();
  expect(info.type).toBe('LineString');
  // Bron ~47°N (Itasca MN), delta ~29°N (Louisiana). Span ~18°.
  expect(info.startLat - info.endLat).toBeGreaterThan(10);
});

test('set 83 — Rio Grande stroomt NW→SE (Colorado → Golf)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Rio Grande' && x.properties.sets?.includes(83));
    if (!f) return null;
    const c = f.geometry.coordinates;
    return { startLat: c[0][1], endLat: c[c.length-1][1],
             startLon: c[0][0], endLon: c[c.length-1][0] };
  });
  expect(info).not.toBeNull();
  // Bron ~37°N/-106°W, monding ~26°N/-97°W. Start noordelijker én westelijker.
  expect(info.startLat).toBeGreaterThan(info.endLat);
  expect(info.startLon).toBeLessThan(info.endLon);
});

test('set 83 — Panamakanaal is korte LineString (Colón → Panama-Stad)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Panamakanaal' && x.properties.sets?.includes(83));
    if (!f) return null;
    const c = f.geometry.coordinates;
    return { type: f.geometry.type, npts: c.length,
             startLat: c[0][1], endLat: c[c.length-1][1] };
  });
  expect(info).not.toBeNull();
  expect(info.type).toBe('LineString');
  // Schematische lijn: Colón (Atlantisch) → Panama-Stad (Pacific). ~9.3°N → ~9.0°N.
  expect(info.startLat).toBeGreaterThan(info.endLat);
  expect(info.startLat).toBeGreaterThan(8.5);
  expect(info.startLat).toBeLessThan(10);
});
