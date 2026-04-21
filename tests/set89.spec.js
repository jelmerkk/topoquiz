/**
 * Set 89 — Midden-Amerika en Caraïben (issue #57)
 *
 * Data-assertions zijn gemigreerd naar test.js (sprint 2 B2). Alleen de
 * UI-check voor het eilanden-fase label blijft hier staan.
 */

const { test, expect } = require('@playwright/test');

test('set 89 — eiland-fase vraagt "Welk eiland is dit?" (niet "provincie")', async ({ page }) => {
  // Deep-link direct naar fase 3 (eilanden, 0-indexed phase=2).
  await page.goto('/?set=89&mode=mc&phase=2');
  await page.waitForSelector('#question-text');
  await expect(page.locator('#question-text')).toHaveText('Welk eiland is dit?');
});
