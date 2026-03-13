const { test, expect } = require('@playwright/test');

test('pagina laadt en toont level-keuze', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#level-select h2')).toContainText('Topografie Quiz');
  await expect(page.locator('#level-select .mode-btn').first()).toBeVisible();
});
