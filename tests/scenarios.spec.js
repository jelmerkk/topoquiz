const { test, expect } = require('@playwright/test');

// Helper: start province quiz (set 54, first level) in given mode
async function startProvinceQuiz(page, mode /* 0=mc, 1=text */) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '5' }).click(); // set 54 is groep 5
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

// ── Kaart-klik modus ──────────────────────────────────────────────────────────

async function startMapClickQuiz(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '5' }).click(); // set 55 is groep 5
  await page.locator('#level-select .mode-btn').nth(1).click(); // set 55 (plaatsen)
  await page.locator('#mode-select .mode-btn:visible').nth(2).click(); // kaart-klik
  await page.waitForSelector('#question-text');
}

test('kaart-klik modus: vraagscherm toont stadsnaam als vraagtekst', async ({ page }) => {
  await startMapClickQuiz(page);
  const name = await page.evaluate(() => currentCity.name);
  await expect(page.locator('#question-text')).toHaveText(name);
});

test('kaart-klik modus: alle markers zijn verborgen tijdens de vraag', async ({ page }) => {
  await startMapClickQuiz(page);
  const markersVisible = await page.evaluate(() => map.hasLayer(markerLayer));
  expect(markersVisible).toBe(false);
});

test('kaart-klik modus: kaart heeft crosshair cursor', async ({ page }) => {
  await startMapClickQuiz(page);
  await expect(page.locator('#map-wrap')).toHaveClass(/map-click-mode/);
});

test('kaart-klik modus: klikken op de kaart toont feedback', async ({ page }) => {
  await startMapClickQuiz(page);
  // Klik ver van alle steden zodat het altijd 'wrong' is (feedback bevat "km")
  await page.evaluate(() => map.fire('click', { latlng: L.latLng(50.8, 3.5) }));
  await expect(page.locator('#feedback')).not.toBeEmpty();
  await expect(page.locator('#feedback')).toContainText('km');
});

test('kaart-klik modus: markers blijven verborgen na antwoord (geeft locaties niet weg)', async ({ page }) => {
  await startMapClickQuiz(page);
  await page.evaluate(() => map.fire('click', { latlng: L.latLng(52.0, 5.0) }));
  const markersVisible = await page.evaluate(() => map.hasLayer(markerLayer));
  expect(markersVisible).toBe(false);
});

test('kaart-klik modus: klik op exacte locatie geeft correct-feedback', async ({ page }) => {
  await startMapClickQuiz(page);
  await page.evaluate(() => {
    map.fire('click', { latlng: L.latLng(currentCity.lat, currentCity.lon) });
  });
  await expect(page.locator('#feedback')).toHaveClass(/fb-ok/);
});

// ── Geraden steden als groene stippen (#29) ──────────────────────────────────

test('kaart-klik modus: correct geraden stad verschijnt als groene stip', async ({ page }) => {
  await startMapClickQuiz(page);
  // Klik op de exacte locatie → correct
  await page.evaluate(() => {
    map.fire('click', { latlng: L.latLng(currentCity.lat, currentCity.lon) });
  });
  await expect(page.locator('#feedback')).toHaveClass(/fb-ok/);
  // Er moet nu een groene cirkelmarker in revealedLayer staan
  const count = await page.evaluate(() => revealedLayer.getLayers().length);
  expect(count).toBe(1);
});

test('kaart-klik modus: groene stippen blijven zichtbaar bij volgende vraag', async ({ page }) => {
  await startMapClickQuiz(page);
  // Beantwoord eerste vraag correct
  await page.evaluate(() => {
    map.fire('click', { latlng: L.latLng(currentCity.lat, currentCity.lon) });
  });
  await expect(page.locator('#feedback')).toHaveClass(/fb-ok/);
  // Wacht op volgende vraag
  await page.waitForFunction(() => !document.querySelector('#feedback').classList.contains('fb-ok'), { timeout: 5000 });
  // revealedLayer moet nog steeds op de kaart staan met 1 marker
  const onMap = await page.evaluate(() => map.hasLayer(revealedLayer));
  expect(onMap).toBe(true);
  const count = await page.evaluate(() => revealedLayer.getLayers().length);
  expect(count).toBe(1);
});

test('kaart-klik modus: fout antwoord voegt geen groene stip toe', async ({ page }) => {
  await startMapClickQuiz(page);
  // Klik ver weg → fout
  await page.evaluate(() => map.fire('click', { latlng: L.latLng(50.8, 3.5) }));
  await expect(page.locator('#feedback')).toContainText('km');
  const count = await page.evaluate(() => revealedLayer.getLayers().length);
  expect(count).toBe(0);
});

test('kaart-klik modus: revealedLayer wordt geleegd bij reset', async ({ page }) => {
  await startMapClickQuiz(page);
  // Beantwoord correct
  await page.evaluate(() => {
    map.fire('click', { latlng: L.latLng(currentCity.lat, currentCity.lon) });
  });
  await expect(page.locator('#feedback')).toHaveClass(/fb-ok/);
  // Reset via menu
  await page.locator('#menu-btn').click();
  await page.locator('#quiz-menu button', { hasText: 'Opnieuw beginnen' }).click();
  await page.waitForSelector('#question-text');
  const count = await page.evaluate(() => revealedLayer.getLayers().length);
  expect(count).toBe(0);
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
