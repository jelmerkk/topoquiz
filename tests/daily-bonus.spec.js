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
  // Statische verificatie: roep nearbyDistractors aan voor elk item in de
  // daily en check dat alle distractors het juiste _itemType hebben. Dit
  // vermijdt de 2s auto-advance-timing van de UI-loop (finishAnswer).
  const results = await page.evaluate(() => {
    const inPool = (n, pool) => pool.some(it => it.name === n);
    const rows = [];
    for (const city of activeCities) {
      // distractorPool() leest global `currentCity` — mirror productie.
      currentCity = city;
      const ds = nearbyDistractors(city, 3);
      const ot = city._itemType;
      const bad = ds.filter(d => {
        if (ot === 'region')  return !inPool(d.name, ALL_PROVINCES);
        if (ot === 'country') return !inPool(d.name, ALL_COUNTRIES);
        if (ot === 'water')   return !inPool(d.name, ALL_WATERS);
        return !inPool(d.name, ALL_CITIES);
      });
      rows.push({ name: city.name, ot, distractors: ds.map(d => d.name), bad: bad.map(b => b.name) });
    }
    return rows;
  });
  for (const r of results) {
    expect(r.bad, `Cross-type distractors voor ${r.ot} ${r.name}: ${r.distractors.join(', ')}`).toEqual([]);
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
  // Laat initiële fitBounds-animatie van de eerste vraag uitsterven voor we
  // Armenia forceren (anders overlapt de nieuwe fitBounds met een lopende).
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const arm = ALL_COUNTRIES.find(c => c.name === 'Armenië');
    arm._itemType = 'country';
    activeCities = [arm, ...activeCities.filter(c => c.name !== 'Armenië').slice(0, 9)];
    buildPolygonLayer('country');
    currentCity = arm;
    setHighlightPolygon('country', arm);
  });
  // fitBounds animeert — wacht tot kaart-center binnen Armenië-range ligt,
  // niet op een vaste timeout (flaky op langzame runners).
  await page.waitForFunction(
    () => {
      const c = map.getCenter();
      return c.lat > 35 && c.lat < 45 && c.lng > 40 && c.lng < 50;
    },
    null,
    { timeout: 4000 }
  );
  const center = await page.evaluate(() => [map.getCenter().lat, map.getCenter().lng]);
  // Armenië ≈ 40°N 45°E — niet NL (≈52°N 5°E)
  expect(center[0]).toBeGreaterThan(35);
  expect(center[0]).toBeLessThan(45);
  expect(center[1]).toBeGreaterThan(40);
  expect(center[1]).toBeLessThan(50);
});
