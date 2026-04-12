/**
 * Set 72 — België en Luxemburg (issue #41)
 * Smoke tests: verschijnt in menu, fases starten correct.
 */

const { test, expect } = require('@playwright/test');

test('set 72 verschijnt in groep 7', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await expect(page.locator('#level-select .mode-btn', { hasText: 'België' })).toBeVisible();
});

test('set 72 — mode-select bereikbaar', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'België' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
});

test('set 72 — fase 1: vraag is "Welk gewest is dit?"', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'België' }).click();
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
  await expect(page.locator('#question-text')).toHaveText('Welk gewest is dit?');
});

test('set 72 — fase 1: #qtot toont 4 (3 gewesten + Luxemburg)', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'België' }).click();
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#qtot');
  await expect(page.locator('#qtot')).toHaveText('4');
});
