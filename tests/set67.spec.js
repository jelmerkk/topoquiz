const { test, expect } = require('@playwright/test');

test('set 67 (Noord-Holland) verschijnt in het level-menu', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '6' }).click(); // set 67 is groep 6
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Noord-Holland' })).toBeVisible();
});

test('set 67 (Noord-Holland) kan worden gestart in meerkeuze modus', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '6' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'Noord-Holland' }).click();
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await expect(page.locator('#question-text')).toBeVisible();
  await expect(page.locator('.opt')).toHaveCount(4);
});
