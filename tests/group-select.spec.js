/**
 * Groep-selectiescherm — issue #39
 *
 * TDD: deze tests zijn geschreven VOOR de implementatie.
 * Ze beschrijven het gewenste gedrag en zijn rood totdat de feature klaar is.
 *
 * Ontwerp (uit #58/#60):
 *   - Startscherm toont 4 groep-knoppen (Groep 5 t/m 8)
 *   - Na selectie: alleen de sets van die groep, plus altijd daily + bonus
 *   - sessionStorage.selectedGroup onthoudt de keuze
 *   - Back-knop op mode-select brengt terug naar groep-overzicht (niet naar groep-keuze)
 */

const { test, expect } = require('@playwright/test');

// ── Groep-keuze scherm ────────────────────────────────────────────────────────

test('startscherm toont 4 groep-knoppen (5, 6, 7, 8)', async ({ page }) => {
  await page.goto('/');
  const groupBtns = page.locator('.group-btn');
  await expect(groupBtns).toHaveCount(4);
  await expect(groupBtns.nth(0)).toContainText('5');
  await expect(groupBtns.nth(1)).toContainText('6');
  await expect(groupBtns.nth(2)).toContainText('7');
  await expect(groupBtns.nth(3)).toContainText('8');
});

test('daily en bonus zijn altijd zichtbaar, ook vóór groepkeuze', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.daily-btn')).toBeVisible();
  await expect(page.locator('.mode-btn.bonus-btn')).toBeVisible();
});

test('zonder groepkeuze zijn geen sets zichtbaar (alleen daily + bonus)', async ({ page }) => {
  await page.goto('/');
  // Geen sessionStorage → geen sets
  await expect(page.locator('#level-select .mode-btn:not(.bonus-btn)')).toHaveCount(0);
});

// ── Groep 5 filtert juist ─────────────────────────────────────────────────────

test('groep 5: toont sets 5.4, 5.5, 5.6, 5.7 — niet 6.x', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '5' }).click();

  await expect(page.locator('#level-select .mode-btn', { hasText: 'Provincies' })).toBeVisible();
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Provinciehoofdsteden' })).toBeVisible();
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Grote steden' })).toBeVisible();
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Wateren' })).toBeVisible();

  // Groep 6 sets mogen NIET zichtbaar zijn
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Overijssel' })).not.toBeVisible();
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Noord-Holland' })).not.toBeVisible();
});

test('groep 5: daily en bonus blijven zichtbaar', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '5' }).click();
  await expect(page.locator('.daily-btn')).toBeVisible();
  await expect(page.locator('.mode-btn.bonus-btn')).toBeVisible();
});

// ── Groep 6 filtert juist ─────────────────────────────────────────────────────

test('groep 6: toont sets 6.1–6.7 — niet 5.x', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '6' }).click();

  await expect(page.locator('#level-select .mode-btn', { hasText: 'Overijssel' })).toBeVisible();
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Noord-Holland' })).toBeVisible();

  // Groep 5 sets mogen NIET zichtbaar zijn
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Provincies' })).not.toBeVisible();
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Wateren' })).not.toBeVisible();
});

// ── Persistentie ──────────────────────────────────────────────────────────────

test('groepkeuze wordt onthouden na terugnavigeren vanuit mode-select', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '6' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'Overijssel' }).click();

  // Terug naar level-select
  await page.locator('#back-btn').click();

  // Groep 6 sets nog steeds zichtbaar — niet terug naar groepkeuze
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Overijssel' })).toBeVisible();
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Provincies' })).not.toBeVisible();
});

test('groepkeuze opgeslagen in sessionStorage', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '5' }).click();

  const stored = await page.evaluate(() => sessionStorage.getItem('selectedGroup'));
  expect(stored).toBe('5');
});

// ── Groep-knoppen staan BOVEN de set-lijst ────────────────────────────────────

test('groep-knoppen zijn zichtbaar boven de set-lijst (niet daarna)', async ({ page }) => {
  await page.goto('/');
  const groupWrap = page.locator('.group-select');
  const levelList = page.locator('#level-select');
  await expect(groupWrap).toBeVisible();
  await expect(levelList).toBeVisible();

  // group-select moet eerder in de DOM staan dan de eerste .mode-btn
  const groupY = await groupWrap.boundingBox().then(b => b?.y ?? 0);
  const firstBtnY = await page.locator('#level-select .mode-btn').first().boundingBox().then(b => b?.y ?? 0);
  expect(groupY).toBeLessThan(firstBtnY);
});
