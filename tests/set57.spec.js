const { test, expect } = require('@playwright/test');
const { waitForPolygonLayer, waitForMapClickReady } = require('./helpers');

async function openWateren(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '5' }).click(); // set 57 is groep 5
  await page.locator('#level-select .mode-btn', { hasText: 'Wateren' }).click();
}

test('set 57 (Wateren) verschijnt in het level-menu', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '5' }).click();
  await expect(page.locator('#level-select .mode-btn', { hasText: 'Wateren' })).toBeVisible();
});

test('set 57 (Wateren) kan worden gestart in meerkeuze modus', async ({ page }) => {
  await openWateren(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await expect(page.locator('#question-text')).toHaveText('Welk water is dit?');
  await expect(page.locator('.opt')).toHaveCount(4);
});

test('set 57 (Wateren) heeft een klik-op-kaart modus', async ({ page }) => {
  await openWateren(page);
  await expect(page.locator('#map-mode-btn')).toBeVisible();
});

test('set 57 (Wateren) klik-op-kaart: waternaam zichtbaar als vraagtekst', async ({ page }) => {
  await openWateren(page);
  await page.locator('#map-mode-btn').click();
  await page.waitForSelector('#question-text');
  const name = await page.evaluate(() => currentCity.name);
  await expect(page.locator('#question-text')).toHaveText(name);
});

test('set 57 (Wateren) klik-op-kaart: klik ver weg geeft afstandsfeedback', async ({ page }) => {
  await openWateren(page);
  await page.locator('#map-mode-btn').click();
  await page.waitForSelector('#question-text');
  await waitForPolygonLayer(page, 'water');
  await waitForMapClickReady(page);
  await page.evaluate(() => map.fire('click', { latlng: L.latLng(50.0, 4.0) }));
  await expect(page.locator('#feedback')).not.toBeEmpty();
  await expect(page.locator('#feedback')).toContainText('km');
});

test('set 57 (Wateren) klik-op-kaart: waterlagen zijn verborgen tijdens de vraag', async ({ page }) => {
  await openWateren(page);
  await page.locator('#map-mode-btn').click();
  await page.waitForSelector('#question-text');
  const allHidden = await page.evaluate(() => {
    return Object.entries(polygonTypes.water.layers).every(([name, layer]) => {
      const style = layer.options;
      const mastered = (streak[name] || 0) >= mastery();
      return mastered || (style.opacity === 0 && style.fillOpacity === 0);
    });
  });
  expect(allHidden).toBe(true);
});

test('set 57 (Wateren) klik-op-kaart: klik op exacte label-locatie geeft correct', async ({ page }) => {
  await openWateren(page);
  await page.locator('#map-mode-btn').click();
  await page.waitForSelector('#question-text');
  // Wacht expliciet tot water-layer gebouwd is én klik-handler aangesloten (#79)
  await waitForPolygonLayer(page, 'water');
  await waitForMapClickReady(page);
  await page.evaluate(() => {
    map.fire('click', { latlng: L.latLng(currentCity.lat, currentCity.lon) });
  });
  await expect(page.locator('#feedback')).toHaveClass(/fb-ok/);
});
