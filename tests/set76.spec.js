/**
 * Set 76 — Midden-Europa en Italië (issue #45)
 *
 * Smoke tests: verschijnt in menu, 3 fases starten correct.
 * Volgorde fases: steden → gebieden → wateren
 */

const { test, expect } = require('@playwright/test');
const { waitForPolygonLayer } = require('./helpers');

async function openSet76(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'Midden-Europa' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startSet76MC(page) {
  await openSet76(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

test('set 76 verschijnt in groep 7', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Midden-Europa' })).toBeVisible();
});

test('set 76 — mode-select bereikbaar', async ({ page }) => {
  await openSet76(page);
  await expect(page.locator('#mode-select')).toBeVisible();
});

test('set 76 — fase 1: vraag bevat stad-vraag', async ({ page }) => {
  await startSet76MC(page);
  await expect(page.locator('#question-text')).toHaveText('Welke plaats is dit?');
});

test('set 76 — fase 1: faseslabel toont "Steden"', async ({ page }) => {
  await startSet76MC(page);
  await expect(page.locator('#phase-label')).toContainText('Steden');
});

test('set 76 — fase 1: #qtot toont 22', async ({ page }) => {
  await startSet76MC(page);
  const tot = await page.locator('#qtot').textContent();
  expect(Number(tot)).toBe(22);
});

test('set 76 — Donau is een LineString', async ({ page }) => {
  await page.goto('/');
  const bounds = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const donau = data.features.find(f => f.properties.name === 'Donau');
    if (!donau || donau.geometry.type !== 'LineString') return null;
    const lats = donau.geometry.coordinates.map(c => c[1]);
    return {
      minLat: Math.min(...lats), maxLat: Math.max(...lats),
      len: donau.geometry.coordinates.length,
    };
  });
  expect(bounds).not.toBeNull();
  // Donau loopt door Duitsland, Oostenrijk, Hongarije → breed latbereik
  expect(bounds.minLat).toBeLessThan(45);
  expect(bounds.maxLat).toBeGreaterThan(48);
  expect(bounds.len).toBeGreaterThan(50);
});

test('set 76 — Sicilië is een polygoon in gewesten.geojson', async ({ page }) => {
  await page.goto('/');
  const found = await page.evaluate(async () => {
    const data = await fetch('/gewesten.geojson').then(r => r.json());
    const sic = data.features.find(f => f.properties.name === 'Sicilië');
    if (!sic) return null;
    const pts = sic.geometry.type === 'MultiPolygon'
      ? sic.geometry.coordinates.reduce((s, p) => s + p[0].length, 0)
      : sic.geometry.coordinates[0].length;
    return { type: sic.geometry.type, pts };
  });
  expect(found).not.toBeNull();
  expect(found.pts).toBeGreaterThan(20);
});
