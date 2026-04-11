/**
 * Regressie-baseline — issue #59
 *
 * Borgt het bestaande gedrag van sets die nog niet door andere specs gedekt zijn:
 *   - Set 61 (Overijssel) — enige groep-6 set die fitOnStart:true test
 *   - Set 98 (dagelijkse uitdaging) — mastery:1, emoji-grid eindscherm
 *   - Set 99 (bonus) — alle steden gemengd, mastery:1
 *
 * Sets 54 (provincies), 57 (wateren) en 55/56/67 (plaatsen) zijn al gedekt
 * door scenarios.spec.js, set57.spec.js en set67.spec.js.
 *
 * Regel: alle tests hier moeten GROEN zijn op de ongewijzigde codebase.
 * Een rode test = regressie stoppen en fixen.
 */

const { test, expect } = require('@playwright/test');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function openSet(page, nameText, group = null) {
  await page.goto('/');
  if (group) await page.locator('.group-btn', { hasText: String(group) }).click();
  await page.locator('#level-select .mode-btn', { hasText: nameText }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startMode(page, modeText) {
  await page.locator('#mode-select .mode-btn', { hasText: modeText }).click();
  await page.waitForSelector('#question-text');
}

async function answerCorrectlyTyped(page) {
  await page.waitForSelector('#city-input:not([disabled])');
  const name = await page.evaluate(() => currentCity.name);
  await page.locator('#city-input').fill(name);
  await page.locator('#city-input').press('Enter');
}

// ── Set 61 — Overijssel (fitOnStart: true) ────────────────────────────────────

test('set 61 verschijnt in het level-menu', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '6' }).click();
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Overijssel' })).toBeVisible();
});

test('set 61 — meerkeuze: vraag, 4 opties, feedback', async ({ page }) => {
  await openSet(page, 'Overijssel', 6);
  await startMode(page, 'Meerkeuze');

  await expect(page.locator('#question-text')).toBeVisible();
  await expect(page.locator('.opt')).toHaveCount(4);

  await page.locator('.opt').first().click();
  await expect(page.locator('#feedback')).not.toBeEmpty();
});

test('set 61 — typen: correct antwoord geeft feedback', async ({ page }) => {
  await openSet(page, 'Overijssel', 6);
  await startMode(page, 'Typen');

  await answerCorrectlyTyped(page);
  await expect(page.locator('#feedback')).not.toBeEmpty();
});

test('set 61 — klik-op-kaart: vraagscherm, crosshair, klik op exacte locatie = correct', async ({ page }) => {
  await openSet(page, 'Overijssel', 6);
  await startMode(page, 'Klik');

  const name = await page.evaluate(() => currentCity.name);
  await expect(page.locator('#question-text')).toHaveText(name);
  await expect(page.locator('#map-wrap')).toHaveClass(/map-click-mode/);

  // Exacte locatie = altijd correct (0 km, onder iedere drempel)
  await page.evaluate(() => {
    map.fire('click', { latlng: L.latLng(currentCity.lat, currentCity.lon) });
  });
  await expect(page.locator('#feedback')).toHaveClass(/fb-ok/);
});

test('set 61 — fitOnStart: kaart zoomt naar Overijssel (niet heel NL)', async ({ page }) => {
  await openSet(page, 'Overijssel', 6);
  await startMode(page, 'Meerkeuze');

  // fitOnStart:true zoomt op de steden van de set → zoomlevel hoger dan default NL-view (zoom 7-8)
  const zoom = await page.evaluate(() => map.getZoom());
  expect(zoom).toBeGreaterThan(8);
});

test('set 61 — klik-op-kaart: ver klikken geeft afstandsfeedback met "km"', async ({ page }) => {
  await openSet(page, 'Overijssel', 6);
  await startMode(page, 'Klik');

  // Klik op Zeeland — altijd ver van Overijssel
  await page.evaluate(() => map.fire('click', { latlng: L.latLng(51.5, 3.7) }));
  await expect(page.locator('#feedback')).toContainText('km');
});

// ── Set 98 & 99 — tijdelijk verborgen ─────────────────────────────────────────
// Daily en bonus zijn tijdelijk verborgen tijdens uitrol van Geobas 7 & 8 levels.
// Herintroductie gepland na oplevering van alle levels (#63).

test('set 98 — daily-btn is tijdelijk verborgen', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.daily-btn')).not.toBeVisible();
});

test('set 99 — bonus-btn is tijdelijk verborgen', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.mode-btn.bonus-btn')).not.toBeVisible();
});
