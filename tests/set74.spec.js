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

// Regressie: bij een correct antwoord in klik-op-kaart voor quizType 'province'
// (gewest/regio) werd eerder een groene stip op de centroïde toegevoegd aan
// revealedLayer. Dat is verwarrend omdat het polygoon al als mastered kleurt.
test("set 74 — fase 2 klik-op-kaart: correct regio voegt geen stip toe aan revealedLayer", async ({ page }) => {
  await openSet74(page);
  // Spring direct naar fase 2 (regio's) via de startPhase-parameter van startQuiz().
  await page.evaluate(() => { selectedSet = 74; startQuiz('map', 1); });
  await page.waitForSelector('#question-text');
  await waitForPolygonLayer(page, 'province');
  await page.waitForFunction(() => {
    const listeners = map._events?.click;
    return Array.isArray(listeners) && listeners.length > 0;
  });
  // Klik op de centroïde van de actieve regio (binnen fuzzy ellipse = 0 km = correct)
  await page.evaluate(() => {
    map.fire('click', { latlng: L.latLng(currentCity.lat, currentCity.lon) });
  });
  await expect(page.locator('#feedback')).toHaveClass(/fb-ok/);
  const revealedCount = await page.evaluate(() => revealedLayer.getLayers().length);
  expect(revealedCount).toBe(0);
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
