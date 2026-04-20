/**
 * Set 83 — Noord- en Midden-Amerika (issue #51)
 *
 * Fase 1: 7 landen (country, polygonen uit landen-noord-midden-amerika.geojson)
 * Fase 2: 17 steden (place) — 4 hoofdsteden (Ottawa, Washington, Mexico-Stad, Havana)
 * Fase 3: 7 gebieden (province): 4 harde gewesten (Alaska, Groenland, Texas, Florida)
 *          + 3 fuzzy gebergten (Rocky Mountains, Sierra Nevada, Appalachen)
 * Fase 4: 4 wateren (water) — Mississippi/Rio Grande/Panamakanaal (LineString),
 *         Caribische Zee (fuzzy, policy)
 */

const { test, expect } = require('@playwright/test');

async function openSet83(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '8' }).click();
  await page.locator('#level-select .mode-btn', { hasText: '8.3' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startSet83MC(page) {
  await openSet83(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

test('set 83 verschijnt in groep 8', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '8' }).click();
  await expect(page.locator('#level-select .mode-btn', { hasText: '8.3' })).toBeVisible();
});

test('set 83 — fase 1: vraag is "Welk land is dit?"', async ({ page }) => {
  await startSet83MC(page);
  await expect(page.locator('#question-text')).toHaveText('Welk land is dit?');
});

test('set 83 — fase 1: #qtot toont 7', async ({ page }) => {
  await startSet83MC(page);
  const tot = await page.locator('#qtot').textContent();
  expect(Number(tot)).toBe(7);
});

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
