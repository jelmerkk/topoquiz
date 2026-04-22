/**
 * Zoom-contract: sets met `set.bounds` declareren een regionaal overzicht.
 * Per-vraag polygon-fit mag dat overzicht niet kapen — anders valt een klein
 * land/water binnen de viewport zonder zichtbare randen (regressie-familie
 * #116/#117/#119 en deze patch voor set 5.8).
 *
 * Dit is de generieke regressie-spec: één contract-assertie per polygon-type
 * in een representatieve set. De test is type-agnostisch — alle polygon-types
 * delen dezelfde orchestrator-guard in setHighlight (hasOverview skip).
 */

const { test, expect } = require('@playwright/test');

// Springt via de globale `selectedSet`/`startQuiz`-API direct naar een
// specifieke fase, zodat de test geen 10+ vragen hoeft te beantwoorden om
// bij fase-2/3 van een phasedSet te komen.
async function jumpToPhase(page, setId, phaseIndex) {
  await page.goto('/');
  await page.evaluate(
    ({ setId, phaseIndex }) => { selectedSet = setId; startQuiz('mc', phaseIndex); },
    { setId, phaseIndex }
  );
  await page.waitForSelector('#question-text');
  // Initial fit (set.bounds) + rAF-override-window afwachten.
  await page.waitForTimeout(500);
}

async function assertZoomStaysOnOverview(page, { startZoomMax }) {
  const zoomBefore = await page.evaluate(() => map.getZoom());
  expect(zoomBefore).toBeLessThanOrEqual(startZoomMax);

  // MC-klik → auto-advance na 2s via setTimeout.
  await page.locator('.opt').first().click();
  await page.waitForTimeout(2500);

  const zoomAfter = await page.evaluate(() => map.getZoom());
  // Zoom mag niet meer dan 1 level afwijken (rAF-settling mag ~0.x).
  expect(Math.abs(zoomAfter - zoomBefore)).toBeLessThanOrEqual(1);
  expect(zoomAfter).toBeLessThanOrEqual(startZoomMax);
}

// Set 7.5 VK+Ierland, fase 3 = 'waters' (quizType: 'water'). Dekt het
// water-pad van de orchestrator-guard. VK-Ierland-bounds zoomt typisch op ~5.
test('zoom-contract — set 75 fase 3 water: blijft op regionaal overzicht', async ({ page }) => {
  await jumpToPhase(page, 75, 2);
  await assertZoomStaysOnOverview(page, { startZoomMax: 6 });
});

// Set 7.1 fase 1 = 'countries' (quizType: 'country'), bredere Europa-bounds
// dan 5.8. Dekt country-pad op een andere zoom-schaal dan de set58-regressie.
test('zoom-contract — set 71 fase 1 country: blijft op regionaal overzicht', async ({ page }) => {
  await jumpToPhase(page, 71, 0);
  await assertZoomStaysOnOverview(page, { startZoomMax: 5 });
});
