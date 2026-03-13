const { test, expect } = require('@playwright/test');

test('level kiezen toont modus-keuze', async ({ page }) => {
  await page.goto('/');
  await page.locator('#level-select .mode-btn').first().click();
  await expect(page.locator('#mode-select .mode-btn').first()).toContainText('Meerkeuze');
  await expect(page.locator('#mode-select .mode-btn')).toHaveCount(2);
});

test('meerkeuze quiz starten toont kaart en vraag', async ({ page }) => {
  await page.goto('/');
  await page.locator('#level-select .mode-btn').first().click();
  await page.locator('#mode-select .mode-btn').first().click();
  await expect(page.locator('#question-text')).toBeVisible();
  await expect(page.locator('.opt')).toHaveCount(4);
  await expect(page.locator('#leaflet-map')).toBeVisible();
});

test('typ-modus starten toont tekstveld', async ({ page }) => {
  await page.goto('/');
  await page.locator('#level-select .mode-btn').first().click();
  await page.locator('#mode-select .mode-btn').nth(1).click();
  await expect(page.locator('#question-text')).toBeVisible();
  await expect(page.locator('#city-input')).toBeVisible();
});

test('hamburger menu > andere quiz kiezen gaat terug naar startscherm', async ({ page }) => {
  await page.goto('/');
  await page.locator('#level-select .mode-btn').first().click();
  await page.locator('#mode-select .mode-btn').first().click();
  await page.locator('#menu-btn').click();
  await page.locator('#quiz-menu button', { hasText: 'Andere quiz' }).click();
  await expect(page.locator('#start-screen')).toBeVisible();
  await expect(page.locator('#level-select h2')).toContainText('Topografie Quiz');
});
