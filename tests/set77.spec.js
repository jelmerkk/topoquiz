/**
 * Set 77 — Oost-Europa (issue #46)
 *
 * Common smoke-tests (menu-visible, mode-select, fase-1 vraag/label/qtot/zoom)
 * zitten in tests/set-smoke.spec.js. Hier alleen set-specifieke regressies.
 */

const { test, expect } = require('@playwright/test');

test('set 77 — Rusland is binnen Europese bounds (geen dateline-wrap)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/landen-europa.geojson').then(r => r.json());
    const rus = data.features.find(f => f.properties.name === 'Rusland');
    if (!rus) return null;
    const polys = rus.geometry.type === 'MultiPolygon' ? rus.geometry.coordinates : [rus.geometry.coordinates];
    let minLon = Infinity, maxLon = -Infinity;
    for (const poly of polys) {
      for (const [lon] of poly[0]) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
      }
    }
    return { type: rus.geometry.type, minLon, maxLon, parts: polys.length };
  });
  expect(info).not.toBeNull();
  // Na dateline-filter: oostelijkste punt ~180°E, westelijkste ~19°E (Kaliningrad)
  expect(info.minLon).toBeGreaterThan(-170);
  expect(info.maxLon).toBeGreaterThan(100);
});

test('set 77 — Dnjepr is een LineString met ~46-55 latbereik', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const dnj = data.features.find(f => f.properties.name === 'Dnjepr');
    if (!dnj || dnj.geometry.type !== 'LineString') return null;
    const lats = dnj.geometry.coordinates.map(c => c[1]);
    return { minLat: Math.min(...lats), maxLat: Math.max(...lats), len: dnj.geometry.coordinates.length };
  });
  expect(info).not.toBeNull();
  expect(info.minLat).toBeLessThan(48);
  expect(info.maxLat).toBeGreaterThan(54);
  expect(info.len).toBeGreaterThan(50);
});

test('set 77 — Donau zit ook in set 77 (hergebruik uit 76)', async ({ page }) => {
  await page.goto('/');
  const sets = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const donau = data.features.find(f => f.properties.name === 'Donau' && (f.properties.sets || []).includes(76));
    return donau ? donau.properties.sets : null;
  });
  expect(sets).toContain(76);
  expect(sets).toContain(77);
});
