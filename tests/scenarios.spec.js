const { test, expect } = require('@playwright/test');

// Helper: start province quiz (set 54, first level) in given mode
async function startProvinceQuiz(page, mode /* 0=mc, 1=text */) {
  await page.goto('/');
  await page.locator('#level-select .mode-btn').first().click();
  await page.locator('#mode-select .mode-btn').nth(mode).click();
  await page.waitForSelector('#question-text');
}

// Helper: answer the current text-mode question correctly using the JS global
async function answerCorrectly(page) {
  await page.waitForSelector('#city-input:not([disabled])');
  const name = await page.evaluate(() => currentCity.name);
  await page.locator('#city-input').fill(name);
  await page.locator('#city-input').press('Enter');
}

// 1. Quiz voltooien → eindscherm
test('provincie-quiz voltooien toont eindscherm met sterren en rating', async ({ page }) => {
  test.setTimeout(60_000);
  await startProvinceQuiz(page, 1);

  // Province quiz has 12 provinces; MASTERY_TEXT=1 so one correct answer each.
  // answerCorrectly() waits for the input to be re-enabled between questions (~2 s each).
  for (let i = 0; i < 12; i++) {
    await answerCorrectly(page);
  }

  await expect(page.locator('#end-screen')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#end-stars')).toBeVisible();
  await expect(page.locator('#end-text')).toContainText('12 provincies');
  await expect(page.locator('#rating-btns')).toBeVisible();
});

// 2. Voortgang opslaan + herstellen
test('voortgang wordt hersteld na terugnavigeren naar modus-keuze', async ({ page }) => {
  await startProvinceQuiz(page, 1);

  // Answer 2 questions correctly
  await answerCorrectly(page);
  await page.waitForSelector('#city-input:not([disabled])');
  await answerCorrectly(page);
  await page.waitForTimeout(300); // saveProgress() runs synchronously in recordCorrect

  expect(parseInt(await page.locator('#sc-ok').textContent())).toBe(2);

  // Simulate back button → popstate → _renderModeSelect
  await page.evaluate(() => window.history.back());
  await expect(page.locator('#mode-select')).toBeVisible();

  // Re-select typing mode → restoreProgress() picks up saved state
  await page.locator('#mode-select .mode-btn').nth(1).click();
  await page.waitForSelector('#question-text');

  expect(parseInt(await page.locator('#sc-ok').textContent())).toBe(2);
});

// 3. Provincie-quiz codepath
test('provincie-quiz toont "Welke provincie is dit?" en 4 antwoordknoppen', async ({ page }) => {
  await startProvinceQuiz(page, 0); // MC mode
  await expect(page.locator('#question-text')).toHaveText('Welke provincie is dit?');
  await expect(page.locator('.opt')).toHaveCount(4);
  await expect(page.locator('#leaflet-map')).toBeVisible();

  // Answering any option produces feedback
  await page.locator('.opt').first().click();
  await expect(page.locator('#feedback')).not.toBeEmpty();
});

// 4. Reset-knop
test('reset wist sessietellers en herstart de quiz', async ({ page }) => {
  await startProvinceQuiz(page, 1);

  await answerCorrectly(page);
  await page.waitForTimeout(300);
  expect(parseInt(await page.locator('#sc-ok').textContent())).toBe(1);

  await page.locator('#menu-btn').click();
  await page.locator('#quiz-menu button', { hasText: 'Opnieuw beginnen' }).click();

  await page.waitForSelector('#city-input:not([disabled])');
  expect(parseInt(await page.locator('#sc-ok').textContent())).toBe(0);
  expect(parseInt(await page.locator('#sc-err').textContent())).toBe(0);
});

// 5a. Fuzzy matching — "Bijna!" bij typfout
test('typmodus: typfout in lang woord geeft "Bijna!" feedback', async ({ page }) => {
  await startProvinceQuiz(page, 1);
  await page.waitForSelector('#city-input:not([disabled])');

  const name = await page.evaluate(() => currentCity.name);
  // Replace last char (all province names ≥ 6 chars → tolerance ≥ 1)
  const last = name.slice(-1);
  const typo = name.slice(0, -1) + (last === 'x' ? 'y' : 'x');

  await page.locator('#city-input').fill(typo);
  await page.locator('#city-input').press('Enter');

  await expect(page.locator('#feedback')).toContainText('Bijna');
});

// 5b. Hint-knop
test('hint-knop onthult beginteken(s) van het antwoord', async ({ page }) => {
  await startProvinceQuiz(page, 1);
  await page.waitForSelector('#city-input:not([disabled])');

  const name = await page.evaluate(() => currentCity.name);

  await page.locator('#hint-btn').click();
  const hint = await page.locator('#hint-display').textContent();

  expect(hint).toMatch(/^Hint:/);
  expect(hint).toContain(name[0]);
});
