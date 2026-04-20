/**
 * Daily + Bonus — issue #80
 *
 * Verifieert de mixed-type daily/bonus per groep:
 * - DAILY_FORMAT + BONUS_FORMAT globaal beschikbaar
 * - dailyPool(dateStr, group) geeft format-compliant heterogene items
 * - Daily-knop in level-select na groepkeuze per groep
 * - Bonus-knop idem
 * - MC modus forceren (geen mode-select tussenstap)
 * - Distractor-pool filtert per _itemType bij mixed session
 */

const { test, expect } = require('@playwright/test');

async function selectGroup(page, g) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: String(g) }).click();
}

test('DAILY_FORMAT en BONUS_FORMAT globaal beschikbaar na laden', async ({ page }) => {
  await page.goto('/');
  const hasConfigs = await page.evaluate(() =>
    typeof DAILY_FORMAT === 'object' && typeof BONUS_FORMAT === 'object' &&
    [5,6,7,8].every(g => Array.isArray(DAILY_FORMAT[g]) && Array.isArray(BONUS_FORMAT[g]))
  );
  expect(hasConfigs).toBe(true);
});

test('#80: dailyPool per groep — deterministisch en 10 items', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const r = {};
    for (const g of [5,6,7,8]) {
      const a = dailyPool('2026-04-20', g);
      const b = dailyPool('2026-04-20', g);
      r[g] = {
        len: a.len = a.length,
        stable: a.map(x => x.name).join() === b.map(x => x.name).join(),
        types: [...new Set(a.map(x => x._itemType))].sort(),
      };
    }
    return r;
  });
  for (const g of [5,6,7,8]) {
    expect(result[g].len).toBe(10);
    expect(result[g].stable).toBe(true);
  }
  // Groep 6: alleen 'place'
  expect(result[6].types).toEqual(['place']);
  // Groep 7 + 8: meerdere types
  expect(result[7].types.length).toBeGreaterThan(1);
  expect(result[8].types.length).toBeGreaterThan(1);
});

test('#80: daily-knop zichtbaar en werkt voor alle groepen', async ({ page }) => {
  for (const g of [5,6,7,8]) {
    await selectGroup(page, g);
    await expect(page.locator('.daily-btn')).toBeVisible();
    await expect(page.locator('.mode-btn.bonus-btn')).toBeVisible();
  }
});

test('#80: daily forceert MC-modus (geen mode-select)', async ({ page }) => {
  await selectGroup(page, 6);
  await page.locator('.daily-btn').click();
  // Daily springt direct naar question screen, geen mode-select
  await expect(page.locator('#mode-select')).not.toBeVisible();
  await page.waitForSelector('#question-text');
  const q = await page.locator('#question-text').textContent();
  expect(q).toBeTruthy();
});

test('#80: bonus forceert MC-modus (geen mode-select)', async ({ page }) => {
  await selectGroup(page, 6);
  await page.locator('.mode-btn.bonus-btn').click();
  await expect(page.locator('#mode-select')).not.toBeVisible();
  await page.waitForSelector('#question-text');
});

test('#80: groep 7 daily bevat meerdere types en rendert correct', async ({ page }) => {
  await selectGroup(page, 7);
  await page.locator('.daily-btn').click();
  await page.waitForSelector('#question-text');
  const info = await page.evaluate(() => ({
    total: activeCities.length,
    types: [...new Set(activeCities.map(c => c._itemType))].sort(),
    currentType: currentCity?._itemType || null,
  }));
  expect(info.total).toBe(10);
  expect(info.types.length).toBeGreaterThan(1);
  expect(info.types).toContain('place');
});

test('#80: distractor-pool filtert per _itemType (geen cross-type)', async ({ page }) => {
  await selectGroup(page, 7);
  await page.locator('.daily-btn').click();
  await page.waitForSelector('#question-text');
  // Loop door alle 10 vragen en check dat de MC-opties altijd hetzelfde _itemType zijn
  for (let i = 0; i < 10; i++) {
    const sameType = await page.evaluate(() => {
      if (!currentCity) return true;
      const ot = currentCity._itemType;
      const opts = Array.from(document.querySelectorAll('#options button'));
      const names = opts.map(b => b.textContent.trim());
      // Distractor-pool mirror: zelfde _itemType
      return names.every(n => {
        // Zoek item in alle pools
        const all = [...ALL_CITIES, ...ALL_COUNTRIES, ...ALL_WATERS, ...ALL_PROVINCES];
        const found = all.find(it => it.name === n);
        if (!found) return false;
        // Match op pool-origine — 'region' matcht ALL_PROVINCES (alle kinds)
        if (ot === 'region')  return ALL_PROVINCES.includes(found);
        if (ot === 'country') return ALL_COUNTRIES.includes(found);
        if (ot === 'water')   return ALL_WATERS.includes(found);
        return ALL_CITIES.includes(found);
      });
    });
    expect(sameType).toBe(true);
    // Klik altijd eerste optie om door te gaan (correctness interesseert ons niet)
    await page.locator('#options button').first().click();
    // Wacht op volgende vraag of einde
    const next = page.locator('#next-btn');
    if (await next.isVisible()) await next.click();
    await page.waitForTimeout(80);
    // Check of de quiz afgelopen is
    const ended = await page.locator('#end-screen').isVisible();
    if (ended) break;
  }
});

test('#80: seed verschilt per groep op dezelfde dag', async ({ page }) => {
  await page.goto('/');
  const diff = await page.evaluate(() =>
    dateSeed('2026-04-20', 7) !== dateSeed('2026-04-20', 8) &&
    dateSeed('2026-04-20', 5) !== dateSeed('2026-04-20', 6));
  expect(diff).toBe(true);
});

// Regressie: bij groep 8 bonus mag de kaart niet op NL blijven hangen bij
// een Armenië-vraag (startQuiz's rAF-fallback zette NL_BOUNDS na de
// per-vraag fitBounds — racede en overschreef).
test('#80: bonus groep 8 zoomt naar item (geen NL-fallback)', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '8' }).click();
  await page.locator('.mode-btn.bonus-btn').click();
  await page.waitForSelector('#question-text');
  await page.evaluate(() => {
    const arm = ALL_COUNTRIES.find(c => c.name === 'Armenië');
    arm._itemType = 'country';
    activeCities = [arm, ...activeCities.filter(c => c.name !== 'Armenië').slice(0, 9)];
    buildPolygonLayer('country');
    currentCity = arm;
    setHighlightPolygon('country', arm);
  });
  await page.waitForTimeout(800);
  const center = await page.evaluate(() => [map.getCenter().lat, map.getCenter().lng]);
  // Armenië ≈ 40°N 45°E — niet NL (≈52°N 5°E)
  expect(center[0]).toBeGreaterThan(35);
  expect(center[0]).toBeLessThan(45);
  expect(center[1]).toBeGreaterThan(40);
  expect(center[1]).toBeLessThan(50);
});
