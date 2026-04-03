const { test, expect } = require('@playwright/test');

test('set 57 (Wateren) verschijnt in het level-menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Wateren' })).toBeVisible();
});

test('set 57 (Wateren) kan worden gestart in meerkeuze modus', async ({ page }) => {
  await page.goto('/');
  await page.locator('#level-select .mode-btn', { hasText: 'Wateren' }).click();
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await expect(page.locator('#question-text')).toHaveText('Welk water is dit?');
  await expect(page.locator('.opt')).toHaveCount(4);
});

test('set 57 (Wateren) heeft geen klik-op-kaart modus', async ({ page }) => {
  await page.goto('/');
  await page.locator('#level-select .mode-btn', { hasText: 'Wateren' }).click();
  await expect(page.locator('#map-mode-btn')).not.toBeVisible();
});
