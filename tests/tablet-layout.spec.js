const { test, expect } = require('@playwright/test');

// #105 — tablet split-view. Op viewport ≥768×600 wordt body.in-quiz een
// 2-koloms grid: kaart links, vraag rechts. Op mobile blijft de stack-layout.

async function startQuiz(page) {
  await page.locator('.group-btn', { hasText: '5' }).click();
  await page.locator('#level-select .mode-btn').first().click();
  await page.locator('#mode-select .mode-btn').nth(0).click(); // MC
  await page.waitForSelector('#question-text');
  await page.waitForSelector('#options .opt'); // grid-items zijn aanwezig
}

test('#105 — tablet (1024×768): kaart links, vraag rechts', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');
  await startQuiz(page);

  const mapBox = await page.locator('#map-wrap').boundingBox();
  const qBox   = await page.locator('#question-box').boundingBox();
  expect(mapBox).not.toBeNull();
  expect(qBox).not.toBeNull();

  // Links/rechts-verhouding: kaart begint links van de vraag.
  expect(mapBox.x).toBeLessThan(qBox.x);
  // Op dezelfde rij: hun top-positie moet dicht bij elkaar liggen
  // (grid align-items: start → beide beginnen op dezelfde y).
  expect(Math.abs(mapBox.y - qBox.y)).toBeLessThan(20);
  // Kaart-kolom ~1.25fr / vraag ~1fr: kaart moet breder zijn.
  expect(mapBox.width).toBeGreaterThan(qBox.width);
});

test('#105 — mobile (414×820): stack-layout — vraag onder kaart', async ({ page }) => {
  await page.setViewportSize({ width: 414, height: 820 });
  await page.goto('/');
  await startQuiz(page);

  const mapBox = await page.locator('#map-wrap').boundingBox();
  const qBox   = await page.locator('#question-box').boundingBox();
  // Stack: question-box onder map-wrap.
  expect(qBox.y).toBeGreaterThan(mapBox.y + mapBox.height - 50);
});

test('#105 — iPhone landscape (844×390): stack-layout blijft (te lage viewport-hoogte)', async ({ page }) => {
  // Min-height 600 in de media-query zorgt dat telefoons in landscape NIET
  // splitsen — zou anders kaart én vraag in ~390px hoogte proppen.
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await startQuiz(page);

  const mapBox = await page.locator('#map-wrap').boundingBox();
  const qBox   = await page.locator('#question-box').boundingBox();
  // Stack-layout: vraag onder kaart (hier mag de verticale afstand klein zijn
  // door de kleine viewport; alleen x-uitlijning matters — beide links
  // uitgelijnd, niet side-by-side).
  expect(Math.abs(mapBox.x - qBox.x)).toBeLessThan(10);
});
