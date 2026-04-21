/**
 * Set 85 — Zuid-Azië (issue #53)
 *
 * Common smoke-tests (menu-visible, mode-select, fase-1 vraag/label/qtot/zoom)
 * zitten in tests/set-smoke.spec.js. Hier alleen set-specifieke regressies.
 */

const { test, expect } = require('@playwright/test');

async function openSet85(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '8' }).click();
  await page.locator('#level-select .mode-btn', { hasText: '8.5' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

test('set 85 — alle 8 landen in landen-zuid-azie.geojson', async ({ page }) => {
  await page.goto('/');
  const names = await page.evaluate(async () => {
    const data = await fetch('/landen-zuid-azie.geojson').then(r => r.json());
    return data.features.map(f => f.properties.name);
  });
  const expected = ['Kazachstan','Oezbekistan','Afghanistan','Pakistan',
                    'India','Nepal','Bangladesh','Sri Lanka'];
  expected.forEach(n => expect(names).toContain(n));
});

test('set 85 — Ganges stroomt NW→ZO (Gangotri → Bengal-delta)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Ganges' && x.properties.sets?.includes(85));
    if (!f) return null;
    const c = f.geometry.coordinates;
    return { type: f.geometry.type, npts: c.length,
             startLat: c[0][1], endLat: c[c.length-1][1],
             startLon: c[0][0], endLon: c[c.length-1][0] };
  });
  expect(info).not.toBeNull();
  expect(info.type).toBe('LineString');
  // Bron ~30.9°N/79.1°E, monding ~22°N/90°E. N→Z én W→O.
  expect(info.startLat).toBeGreaterThan(info.endLat);
  expect(info.startLon).toBeLessThan(info.endLon);
});

test('set 85 — Indus stroomt NE→ZW (Tibet → Karachi)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Indus' && x.properties.sets?.includes(85));
    if (!f) return null;
    const c = f.geometry.coordinates;
    return { startLat: c[0][1], endLat: c[c.length-1][1],
             startLon: c[0][0], endLon: c[c.length-1][0] };
  });
  expect(info).not.toBeNull();
  // Bron ~32°N/81°E (Tibet), monding ~24°N/67°E (Karachi). Start noordelijker + oostelijker.
  expect(info.startLat).toBeGreaterThan(info.endLat);
  expect(info.startLon).toBeGreaterThan(info.endLon);
});

test('set 85 — Mount Everest is peak (nieuw type) en ligt op ~27.99°N/86.93°E', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(() => {
    const e = ALL_PROVINCES.find(p => p.name === 'Mount Everest' && p.sets?.includes(85));
    return e ? { shape: e.shape, kind: e.kind, lat: e.lat, lon: e.lon, size: e.size } : null;
  });
  expect(info).not.toBeNull();
  expect(info.shape).toBe('peak');
  expect(info.kind).toBe('berg');
  expect(info.lat).toBeCloseTo(27.99, 1);
  expect(info.lon).toBeCloseTo(86.93, 1);
  expect(typeof info.size).toBe('number');
});

test('set 85 — Indische Oceaan gedeeld tussen sets 84 en 85', async ({ page }) => {
  await page.goto('/');
  const sets = await page.evaluate(() => {
    const w = ALL_WATERS.find(x => x.name === 'Indische Oceaan');
    return w?.sets ?? [];
  });
  expect(sets).toContain(84);
  expect(sets).toContain(85);
});

test('set 85 — gebieden-fase rendert 2 features (Himalaya + Everest)', async ({ page }) => {
  await openSet85(page);
  // Tap naar gebieden door eerst MC te kiezen en alle fases af te werken is
  // te traag — we valideren datagedreven via ALL_PROVINCES en polygonTypes.
  const result = await page.evaluate(() => {
    const inSet = ALL_PROVINCES.filter(p => p.sets?.includes(85));
    return {
      count: inSet.length,
      shapes: inSet.map(p => p.shape).sort(),
    };
  });
  expect(result.count).toBe(2);
  expect(result.shapes).toEqual(['fuzzy','peak']);
});
