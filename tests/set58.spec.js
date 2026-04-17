/**
 * Set 58 — Onze buren (Geobas 5, hoofdstuk 8)
 *
 * Smoke tests: verschijnt in menu, 2 fases starten correct.
 * Volgorde fases: landen → hoofdsteden
 */

const { test, expect } = require('@playwright/test');
const { waitForPolygonLayer } = require('./helpers');

async function openSet58(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '5' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'Onze buren' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startSet58MC(page) {
  await openSet58(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

test('set 58 verschijnt in groep 5', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '5' }).click();
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Onze buren' })).toBeVisible();
});

test('set 58 — mode-select bereikbaar', async ({ page }) => {
  await openSet58(page);
  await expect(page.locator('#mode-select')).toBeVisible();
});

test('set 58 — fase 1: vraag is "Welk land is dit?"', async ({ page }) => {
  await startSet58MC(page);
  await expect(page.locator('#question-text')).toHaveText('Welk land is dit?');
});

test('set 58 — fase 1: faseslabel toont "Landen"', async ({ page }) => {
  await startSet58MC(page);
  await expect(page.locator('#phase-label')).toContainText('Landen');
});

test('set 58 — fase 1: #qtot toont 16', async ({ page }) => {
  await startSet58MC(page);
  const tot = await page.locator('#qtot').textContent();
  expect(Number(tot)).toBe(16);
});

test('set 58 — MC start: kaartzoom geschikt voor Europa-viewport', async ({ page }) => {
  await startSet58MC(page);
  const zoom = await page.evaluate(() => map.getZoom());
  expect(zoom).toBeGreaterThanOrEqual(3);
  expect(zoom).toBeLessThanOrEqual(7);
});

test('set 58 — Slovenië is een polygoon in landen-europa.geojson', async ({ page }) => {
  await page.goto('/');
  const found = await page.evaluate(async () => {
    const data = await fetch('/landen-europa.geojson').then(r => r.json());
    const slo = data.features.find(f => f.properties.name === 'Slovenië');
    if (!slo) return null;
    const pts = slo.geometry.type === 'MultiPolygon'
      ? slo.geometry.coordinates.reduce((s, p) => s + p[0].length, 0)
      : slo.geometry.coordinates[0].length;
    return { type: slo.geometry.type, pts };
  });
  expect(found).not.toBeNull();
  expect(found.pts).toBeGreaterThan(10);
});
