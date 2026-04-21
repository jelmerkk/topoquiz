// Router-tests voor #94. Dekken deep-link, back-button, dev-menu,
// en scherm-zichtbaarheid-invariant (na elke transition alleen de
// juiste divs zichtbaar).

const { test, expect } = require('@playwright/test');

// Verwachte zichtbaarheids-tabel per scherm. Synced met SCREEN_VISIBILITY in
// index.html — als die wijzigt moet deze test mee.
const VIS = {
  'level-select': { 'start-screen': true, 'level-select': true, 'mode-select': false, 'score-bar': false, 'map-wrap': false, 'question-box': false, 'hard-panel': false, 'end-screen': false },
  'mode-select':  { 'start-screen': true, 'level-select': false, 'mode-select': true,  'score-bar': false, 'map-wrap': false, 'question-box': false, 'hard-panel': false, 'end-screen': false },
  'quiz':         { 'start-screen': false,                                               'score-bar': true,  'map-wrap': true,  'question-box': true,  'hard-panel': false, 'end-screen': false },
  'end':          { 'start-screen': false,                                               'score-bar': false, 'map-wrap': false, 'question-box': false, 'hard-panel': false, 'end-screen': true  },
};

async function assertVisibility(page, screen) {
  const expected = VIS[screen];
  const actual = await page.evaluate((ids) => {
    const out = {};
    for (const id of ids) {
      const el = document.getElementById(id);
      // display !== 'none' telt als zichtbaar (block/flex/"" allemaal OK).
      out[id] = el ? window.getComputedStyle(el).display !== 'none' : false;
    }
    return out;
  }, Object.keys(expected));
  for (const [id, want] of Object.entries(expected)) {
    expect(actual[id], `#${id} visibility op ${screen}`).toBe(want);
  }
}

test('deep-link ?set=74 → mode-select; back → level-select', async ({ page }) => {
  await page.goto('/?set=74');
  await expect(page.locator('#start-level-name')).toContainText('Duitsland');
  await assertVisibility(page, 'mode-select');
  await page.goBack();
  await expect(page.locator('#level-select')).toBeVisible();
  await assertVisibility(page, 'level-select');
});

test('deep-link ?set=74&mode=mc → quiz; back → level-select', async ({ page }) => {
  await page.goto('/?set=74&mode=mc');
  await page.waitForSelector('#question-text:visible');
  await assertVisibility(page, 'quiz');
  // Deep-link gebruikt history:'replace' zodat één back-press de gebruiker
  // niet op een lege pagina zet. Back → level-select (het init-state).
  await page.goBack();
  await expect(page.locator('#level-select')).toBeVisible();
  await assertVisibility(page, 'level-select');
});

test('deep-link ?set=98&mode=mc (daily) opent quiz direct', async ({ page }) => {
  await page.goto('/?set=98&mode=mc');
  await page.waitForSelector('#question-text:visible');
  await assertVisibility(page, 'quiz');
});

test('normal flow: level → mode → quiz; back chain', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'Duitsland' }).click();
  await assertVisibility(page, 'mode-select');
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text:visible');
  await assertVisibility(page, 'quiz');
  await page.goBack();
  await assertVisibility(page, 'mode-select');
  await page.goBack();
  await assertVisibility(page, 'level-select');
});

test('body.in-quiz wordt verwijderd bij popstate uit quiz', async ({ page }) => {
  await page.goto('/?set=74&mode=mc');
  await page.waitForSelector('#question-text:visible');
  expect(await page.evaluate(() => document.body.classList.contains('in-quiz'))).toBe(true);
  await page.goBack();
  await expect(page.locator('#level-select')).toBeVisible();
  expect(await page.evaluate(() => document.body.classList.contains('in-quiz'))).toBe(false);
});

test('dev-menu via ?dev=1 gebruikt replace (geen extra history-entry)', async ({ page }) => {
  await page.goto('/?dev=1');
  await page.waitForSelector('#dev-panel .body:visible');
  // Kies set 55 (plaatsen groep 5) + Meerkeuze. Dev-set dropdown start met
  // een voorgeselecteerde waarde; set 55 ligt binnen het standaard-bereik.
  await page.selectOption('#dev-panel #dev-set', '55');
  await page.selectOption('#dev-panel #dev-mode', 'mc');
  const histBefore = await page.evaluate(() => history.length);
  await page.locator('#dev-go').click();
  await page.waitForSelector('#question-text:visible');
  const histAfter = await page.evaluate(() => history.length);
  // history:'replace' → geen nieuwe entry.
  expect(histAfter).toBe(histBefore);
  await assertVisibility(page, 'quiz');
});
