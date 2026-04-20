/**
 * Set 84 — Midden-Oosten (issue #52)
 *
 * Fase 1: 13 landen (country, polygonen uit landen-midden-oosten.geojson)
 * Fase 2: 13 steden (place) — 12 hoofdsteden + Mekka (geen capital)
 * Fase 3: 8 wateren (water) — Eufraat LineString + Suezkanaal (gedeeld met 82)
 *         + 6 fuzzy zeeën (Zwarte/Rode/Perzische Golf/Kaspische/Middellandse/Indische)
 *
 * Geen province-fase — opdrachtblad heeft geen gebieden.
 */

const { test, expect } = require('@playwright/test');

async function openSet84(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '8' }).click();
  await page.locator('#level-select .mode-btn', { hasText: '8.4' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startSet84MC(page) {
  await openSet84(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

test('set 84 verschijnt in groep 8', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '8' }).click();
  await expect(page.locator('#level-select .mode-btn', { hasText: '8.4' })).toBeVisible();
});

test('set 84 — fase 1: vraag is "Welk land is dit?"', async ({ page }) => {
  await startSet84MC(page);
  await expect(page.locator('#question-text')).toHaveText('Welk land is dit?');
});

test('set 84 — fase 1: #qtot toont 13', async ({ page }) => {
  await startSet84MC(page);
  const tot = await page.locator('#qtot').textContent();
  expect(Number(tot)).toBe(13);
});

test('set 84 — alle 13 landen in landen-midden-oosten.geojson', async ({ page }) => {
  await page.goto('/');
  const names = await page.evaluate(async () => {
    const data = await fetch('/landen-midden-oosten.geojson').then(r => r.json());
    return data.features.map(f => f.properties.name);
  });
  const expected = ['Turkije','Syrië','Libanon','Israël','Jordanië','Irak','Iran',
    'Saoedi-Arabië','Jemen','Koeweit','Georgië','Armenië','Azerbeidzjan'];
  expected.forEach(n => expect(names).toContain(n));
});

test('set 84 — Eufraat stroomt NW→ZO (Turkije → Shatt al-Arab)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Eufraat' && x.properties.sets?.includes(84));
    if (!f) return null;
    const c = f.geometry.coordinates;
    return { type: f.geometry.type, npts: c.length,
             startLat: c[0][1], endLat: c[c.length-1][1],
             startLon: c[0][0], endLon: c[c.length-1][0] };
  });
  expect(info).not.toBeNull();
  expect(info.type).toBe('LineString');
  // Bron ~39°N/40°E (Oost-Turkije), monding ~31°N/47°E (Shatt al-Arab).
  expect(info.startLat).toBeGreaterThan(info.endLat);
  expect(info.startLon).toBeLessThan(info.endLon);
});

test('set 84 — Suezkanaal gedeeld tussen sets 82 en 84', async ({ page }) => {
  await page.goto('/');
  const sets = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Suezkanaal');
    return f?.properties.sets ?? [];
  });
  expect(sets).toContain(82);
  expect(sets).toContain(84);
});

test('set 84 — Mekka in ALL_CITIES maar geen hoofdstad', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(() => {
    const m = ALL_CITIES.find(c => c.name === 'Mekka' && c.sets?.includes(84));
    return m ? { found: true, capital: !!m.capital, lat: m.lat, lon: m.lon } : { found: false };
  });
  expect(info.found).toBe(true);
  expect(info.capital).toBe(false);
  // Mekka ~21.4°N/39.8°E.
  expect(info.lat).toBeGreaterThan(20); expect(info.lat).toBeLessThan(23);
});
