/**
 * Set 74 — Duitsland (issue #43)
 *
 * Smoke tests: verschijnt in menu, 3 fases starten correct.
 * Volgorde fases: steden → regio's → rivieren
 */

const { test, expect } = require('@playwright/test');
const { waitForPolygonLayer } = require('./helpers');

async function openSet74(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'Duitsland' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startSet74MC(page) {
  await openSet74(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

test('set 74 verschijnt in groep 7', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Duitsland' })).toBeVisible();
});

test('set 74 — mode-select bereikbaar', async ({ page }) => {
  await openSet74(page);
  await expect(page.locator('#mode-select')).toBeVisible();
});

test('set 74 — fase 1: vraag is "Welke plaats is dit?"', async ({ page }) => {
  await startSet74MC(page);
  await expect(page.locator('#question-text')).toHaveText('Welke plaats is dit?');
});

test('set 74 — fase 1: faseslabel toont "Steden"', async ({ page }) => {
  await startSet74MC(page);
  await expect(page.locator('#phase-label')).toContainText('Steden');
});

test('set 74 — fase 1: #qtot toont 18', async ({ page }) => {
  await startSet74MC(page);
  const tot = await page.locator('#qtot').textContent();
  expect(Number(tot)).toBe(18);
});

test('set 74 — MC start: kaartzoom geschikt voor DE-viewport', async ({ page }) => {
  await startSet74MC(page);
  const zoom = await page.evaluate(() => map.getZoom());
  expect(zoom).toBeGreaterThanOrEqual(4);
  expect(zoom).toBeLessThanOrEqual(7);
});

test('set 74 — Rijn is een LineString die tot in Duitsland loopt', async ({ page }) => {
  await page.goto('/');
  const bounds = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const rijn = data.features.find(f => f.properties.name === 'Rijn');
    if (!rijn || rijn.geometry.type !== 'LineString') return null;
    const lats = rijn.geometry.coordinates.map(c => c[1]);
    return { minLat: Math.min(...lats), maxLat: Math.max(...lats), len: rijn.geometry.coordinates.length };
  });
  expect(bounds).not.toBeNull();
  // Minstens tot in Zwitserland/Bodensee (< 47) en tot in NL (> 51.5)
  expect(bounds.minLat).toBeLessThan(48);
  expect(bounds.maxLat).toBeGreaterThan(51.5);
  expect(bounds.len).toBeGreaterThan(100);
});

test('set 74 — Elbe en Moezel zitten in wateren.geojson als LineString', async ({ page }) => {
  await page.goto('/');
  const rivers = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const out = {};
    for (const name of ['Elbe', 'Moezel']) {
      const f = data.features.find(x => x.properties.name === name);
      out[name] = f ? { type: f.geometry.type, len: f.geometry.coordinates.length } : null;
    }
    return out;
  });
  expect(rivers.Elbe?.type).toBe('LineString');
  expect(rivers.Elbe?.len).toBeGreaterThan(100);
  expect(rivers.Moezel?.type).toBe('LineString');
  expect(rivers.Moezel?.len).toBeGreaterThan(100);
});
