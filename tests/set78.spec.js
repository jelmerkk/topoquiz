/**
 * Set 78 — Noord-Europa (issue #47)
 *
 * Fase 1: 4 landen (country) — Noorwegen, Zweden, Finland, Denemarken
 * Fase 2: 11 steden (place)
 * Fase 3: 2 gebieden (province, fuzzy: Lapland, Jutland)
 * Fase 4: 6 wateren (water)
 */

const { test, expect } = require('@playwright/test');

async function openSet78(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await page.locator('#level-select .mode-btn', { hasText: '7.8' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startSet78MC(page) {
  await openSet78(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

test('set 78 verschijnt in groep 7', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await expect(page.locator('#level-select .mode-btn', { hasText: '7.8' })).toBeVisible();
});

test('set 78 — mode-select bereikbaar', async ({ page }) => {
  await openSet78(page);
  await expect(page.locator('#mode-select')).toBeVisible();
});

test('set 78 — fase 1: vraag is "Welk land is dit?"', async ({ page }) => {
  await startSet78MC(page);
  await expect(page.locator('#question-text')).toHaveText('Welk land is dit?');
});

test('set 78 — fase 1: faseslabel toont "Landen"', async ({ page }) => {
  await startSet78MC(page);
  await expect(page.locator('#phase-label')).toContainText('Landen');
});

test('set 78 — fase 1: #qtot toont 4', async ({ page }) => {
  await startSet78MC(page);
  const tot = await page.locator('#qtot').textContent();
  expect(Number(tot)).toBe(4);
});

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
