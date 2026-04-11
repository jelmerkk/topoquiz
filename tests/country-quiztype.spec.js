/**
 * country quizType — stap 3
 *
 * Borgt dat set 70 (Baltische staten) werkt met quizType 'country':
 *   - Polygonen worden getoond op de kaart (niet stippen)
 *   - MC-modus: vraag zichtbaar, 4 opties, correct antwoord geeft feedback
 *   - Klik-modus: klik ín polygoon = correct
 *
 * Deze tests zijn BEWUST ROOD totdat stap 3 volledig geïmplementeerd is:
 *   - ALL_COUNTRIES in cities.js
 *   - landen-europa.geojson
 *   - country-rendering in index.html
 */

const { test, expect } = require('@playwright/test');

async function openSet70(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'Baltische staten' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

// ── Meerkeuze ─────────────────────────────────────────────────────────────────

test('set 70 — meerkeuze: vraag zichtbaar, 4 opties', async ({ page }) => {
  await openSet70(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');

  await expect(page.locator('#question-text')).toBeVisible();
  await expect(page.locator('.opt')).toHaveCount(4);
});

test('set 70 — meerkeuze: correct antwoord geeft feedback', async ({ page }) => {
  await openSet70(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');

  const name = await page.evaluate(() => currentCity.name);
  await page.locator('.opt', { hasText: name }).click();
  await expect(page.locator('#feedback')).not.toBeEmpty();
});

test('set 70 — meerkeuze: polygoon gemarkeerd (geen punt-marker)', async ({ page }) => {
  await openSet70(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');

  // Country quizType toont een polygoon-laag, geen gewone punt-marker
  const hasCountryLayer = await page.evaluate(() => {
    return typeof countryQuizLayer !== 'undefined' && countryQuizLayer !== null;
  });
  expect(hasCountryLayer).toBe(true);
});

// ── Klik-op-kaart ─────────────────────────────────────────────────────────────

test('set 70 — klik: klik ín polygoon = correct', async ({ page }) => {
  await openSet70(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Klik' }).click();
  await page.waitForSelector('#question-text');

  // Klik op het middelpunt van het huidige land (exacte lat/lon) → altijd correct
  await page.evaluate(() => {
    map.fire('click', { latlng: L.latLng(currentCity.lat, currentCity.lon) });
  });
  await expect(page.locator('#feedback')).toHaveClass(/fb-ok/);
});

test('set 70 — klik: ver klikken geeft afstandsfeedback met "km"', async ({ page }) => {
  await openSet70(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Klik' }).click();
  await page.waitForSelector('#question-text');

  // Klik op Nederland — altijd ver van de Baltische staten
  await page.evaluate(() => {
    map.fire('click', { latlng: L.latLng(52.37, 4.90) });
  });
  await expect(page.locator('#feedback')).toContainText('km');
});

// ── Kaartviewport ─────────────────────────────────────────────────────────────

test('set 70 — kaart zoomt naar Europa (niet NL)', async ({ page }) => {
  await openSet70(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');

  // EU-viewport is verder uitgezoomd dan NL-viewport (zoom ~5 vs zoom 7-8)
  const zoom = await page.evaluate(() => map.getZoom());
  // EU bounds geeft circa zoom 4-5; NL geeft zoom 7-8
  expect(zoom).toBeLessThan(7);
});
