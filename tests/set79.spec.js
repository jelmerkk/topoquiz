/**
 * Set 79 — Zuidoost-Europa (issue #48)
 *
 * Fase 1: 13 landen (country)
 * Fase 2: 15 steden (place)
 * Fase 3: 1 gebied (province, polygoon: Kreta)
 * Fase 4: 2 wateren (water)
 */

const { test, expect } = require('@playwright/test');

async function openSet79(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await page.locator('#level-select .mode-btn', { hasText: '7.9' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startSet79MC(page) {
  await openSet79(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

test('set 79 verschijnt in groep 7', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await expect(page.locator('#level-select .mode-btn', { hasText: '7.9' })).toBeVisible();
});

test('set 79 — mode-select bereikbaar', async ({ page }) => {
  await openSet79(page);
  await expect(page.locator('#mode-select')).toBeVisible();
});

test('set 79 — fase 1: vraag is "Welk land is dit?"', async ({ page }) => {
  await startSet79MC(page);
  await expect(page.locator('#question-text')).toHaveText('Welk land is dit?');
});

test('set 79 — fase 1: #qtot toont 13', async ({ page }) => {
  await startSet79MC(page);
  const tot = await page.locator('#qtot').textContent();
  expect(Number(tot)).toBe(13);
});

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
