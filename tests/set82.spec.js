/**
 * Set 82 — Afrika (issue #50)
 *
 * Fase 1: 13 landen (country, polygonen uit landen-afrika.geojson)
 * Fase 2: 15 steden (place)
 * Fase 3: 3 gebieden (province, fuzzy: Sahara, Atlasgebergte, Canarische Eilanden)
 * Fase 4: 7 wateren (water) — rivieren (LineString), Victoriameer (Polygon),
 *         Rode Zee + Straat van Gibraltar (fuzzy, policy)
 */

const { test, expect } = require('@playwright/test');

async function openSet82(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '8' }).click();
  await page.locator('#level-select .mode-btn', { hasText: '8.2' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startSet82MC(page) {
  await openSet82(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

test('set 82 verschijnt in groep 8', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '8' }).click();
  await expect(page.locator('#level-select .mode-btn', { hasText: '8.2' })).toBeVisible();
});

test('set 82 — fase 1: vraag is "Welk land is dit?"', async ({ page }) => {
  await startSet82MC(page);
  await expect(page.locator('#question-text')).toHaveText('Welk land is dit?');
});

test('set 82 — fase 1: #qtot toont 13', async ({ page }) => {
  await startSet82MC(page);
  const tot = await page.locator('#qtot').textContent();
  expect(Number(tot)).toBe(13);
});

test('set 82 — alle 13 landen in landen-afrika.geojson', async ({ page }) => {
  await page.goto('/');
  const names = await page.evaluate(async () => {
    const data = await fetch('/landen-afrika.geojson').then(r => r.json());
    return data.features.map(f => f.properties.name);
  });
  const expected = ['Marokko','Algerije','Tunesië','Egypte','Sudan','Ethiopië',
                    'Kenia','Tanzania','Nigeria','Ghana','Senegal','DR Congo','Zuid-Afrika'];
  expected.forEach(n => expect(names).toContain(n));
});

test('set 82 — Nijl LineString loopt zuid→noord (brontoe→Middellandse Zee)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Nijl' && x.properties.sets?.includes(82));
    if (!f) return null;
    const c = f.geometry.coordinates;
    return { type: f.geometry.type, npts: c.length,
             startLat: c[0][1], endLat: c[c.length-1][1] };
  });
  expect(info).not.toBeNull();
  expect(info.type).toBe('LineString');
  // Nijl stroomt naar het noorden — eindpunt (delta) noordelijker dan bron.
  // OSM Q3392 is de "Nijl proper" vanaf samenvloeiing in Khartoem (~16°N)
  // tot delta (~30°N); Witte/Blauwe Nijl zijn aparte relaties. Span ~14°.
  expect(info.endLat - info.startLat).toBeGreaterThan(10);
});

test('set 82 — Victoriameer is Polygon/MultiPolygon op evenaar', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Victoriameer' && x.properties.sets?.includes(82));
    if (!f) return null;
    // Grootste ring nemen voor bbox.
    const rings = f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates[0];
    const coords = rings[0];
    const lats = coords.map(c => c[1]), lons = coords.map(c => c[0]);
    return { type: f.geometry.type, cy: (Math.min(...lats)+Math.max(...lats))/2,
             cx: (Math.min(...lons)+Math.max(...lons))/2 };
  });
  expect(info).not.toBeNull();
  expect(['Polygon','MultiPolygon']).toContain(info.type);
  // Victoriameer ligt rond de evenaar (~ -1°N tot -3°S) en 32-35°E.
  expect(info.cy).toBeGreaterThan(-3);
  expect(info.cy).toBeLessThan(1);
  expect(info.cx).toBeGreaterThan(31);
  expect(info.cx).toBeLessThan(36);
});
