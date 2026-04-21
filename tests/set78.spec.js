/**
 * Set 78 — Noord-Europa (issue #47)
 *
 * Common smoke-tests (menu-visible, mode-select, fase-1 vraag/label/qtot/zoom)
 * zitten in tests/set-smoke.spec.js. Hier alleen set-specifieke regressies.
 */

const { test, expect } = require('@playwright/test');

test('set 78 — Scandinavische landen hebben sets: [78]', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/landen-europa.geojson').then(r => r.json());
    const targets = ['Noorwegen', 'Zweden', 'Finland', 'Denemarken'];
    return targets.map(n => {
      const f = data.features.find(x => x.properties.name === n);
      return { n, sets: f?.properties.sets || null };
    });
  });
  info.forEach(({ n, sets }) => {
    expect(sets, `${n} sets`).toContain(78);
  });
});

test('set 78 — Sont polygoon ligt in Øresund-bereik (55-56°N, 12-13°E)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const sont = data.features.find(f => f.properties.name === 'Sont');
    if (!sont) return null;
    const coords = sont.geometry.coordinates[0];
    const lons = coords.map(c => c[0]), lats = coords.map(c => c[1]);
    return { minLon: Math.min(...lons), maxLon: Math.max(...lons),
             minLat: Math.min(...lats), maxLat: Math.max(...lats) };
  });
  expect(info).not.toBeNull();
  expect(info.minLon).toBeGreaterThan(11);
  expect(info.maxLon).toBeLessThan(14);
  expect(info.minLat).toBeGreaterThan(55);
  expect(info.maxLat).toBeLessThan(57);
});
