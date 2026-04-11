/**
 * phases-mechaniek — stap 4
 *
 * Borgt dat sets met een `phases`-array sequentieel door hun fases lopen:
 *   - Fase-label zichtbaar in de voortgangsbalk ("Landen", "Hoofdsteden")
 *   - #qtot toont het item-aantal van de HUIDIGE fase (niet de volledige set)
 *   - Na alle items in fase 1 gememoreerd → transitiescherm ("🎉 Landen af!")
 *   - Na transitie start fase 2 automatisch met het juiste quizType
 *
 * Set 70 (Baltische staten) is het testvoertuig:
 *   - Fase 1: 4 landen (country), mastery 1
 *   - Fase 2: 3 hoofdsteden (place), mastery 1
 *
 * Alle tests zijn BEWUST ROOD totdat stap 4 geïmplementeerd is.
 */

const { test, expect } = require('@playwright/test');

async function openSet70(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '7' }).click();
  await page.locator('#level-select .mode-btn', { hasText: 'Baltische staten' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startPhaseQuiz(page) {
  await openSet70(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

// Beantwoordt de huidige MC-vraag correct en wacht tot de volgende state actief is.
// State = volgende vraag, transitiescherm, of eindscherm.
async function answerMCCorrectly(page) {
  const name = await page.evaluate(() => currentCity.name);
  await page.locator('.opt', { hasText: name }).click();
  await page.waitForFunction(() => {
    // end-screen: normale block-element → offsetParent werkt
    if (document.getElementById('end-screen')?.offsetParent !== null) return true;
    // phase-transition: position:fixed → offsetParent is altijd null, check via display
    const pt = document.getElementById('phase-transition');
    if (pt && getComputedStyle(pt).display !== 'none') return true;
    const opts = document.querySelectorAll('.opt');
    return opts.length > 0 && !opts[0].disabled;
  }, { timeout: 10000 });
}

// ── Viewport bij start ────────────────────────────────────────────────────────

test('set 70 — MC start: kaartzoom >= 4 (Baltische viewport, niet heel Europa)', async ({ page }) => {
  await startPhaseQuiz(page);
  const zoom = await page.evaluate(() => map.getZoom());
  expect(zoom).toBeGreaterThanOrEqual(4);
});

test('set 70 — MC start: eerste land is zichtbaar in viewport', async ({ page }) => {
  await startPhaseQuiz(page);
  const visible = await page.evaluate(() => {
    const bounds = map.getBounds();
    const country = activeCities[0];
    return bounds.contains([country.lat, country.lon]);
  });
  expect(visible).toBe(true);
});

// ── Fase-label en voortgang ────────────────────────────────────────────────────

test('set 70 — fase 1: voortgangslabel toont "Landen"', async ({ page }) => {
  await startPhaseQuiz(page);
  await expect(page.locator('#phase-label')).toBeVisible();
  await expect(page.locator('#phase-label')).toContainText('Landen');
});

test('set 70 — fase 1: #qtot toont 4 (fase-items, niet totaal)', async ({ page }) => {
  await startPhaseQuiz(page);
  const tot = await page.locator('#qtot').textContent();
  expect(Number(tot)).toBe(4);
});

test('set 70 — fase 1: vraag is "Welk land is dit?"', async ({ page }) => {
  await startPhaseQuiz(page);
  await expect(page.locator('#question-text')).toHaveText('Welk land is dit?');
});

// ── Fase-overgang ─────────────────────────────────────────────────────────────

test('set 70 — na alle landen gememoreerd: transitiescherm zichtbaar', async ({ page }) => {
  test.setTimeout(30_000);
  await startPhaseQuiz(page);

  // Beantwoord alle 4 landen correct (mastery=1 → 1× per land genoeg)
  for (let i = 0; i < 4; i++) {
    await answerMCCorrectly(page);
  }

  await expect(page.locator('#phase-transition')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#phase-transition')).toContainText('Landen');
});

test('set 70 — na transitie: fase 2 "Hoofdsteden" gestart', async ({ page }) => {
  test.setTimeout(30_000);
  await startPhaseQuiz(page);

  for (let i = 0; i < 4; i++) {
    await answerMCCorrectly(page);
  }

  // Wacht tot transitiescherm verdwijnt en fase 2 begint
  await expect(page.locator('#phase-transition')).toBeVisible({ timeout: 5000 });
  await page.waitForFunction(() => {
    const t = document.getElementById('phase-transition');
    return !t || getComputedStyle(t).display === 'none';
  }, { timeout: 8000 });

  await expect(page.locator('#question-text')).toHaveText('Welke plaats is dit?', { timeout: 5000 });
  await expect(page.locator('#phase-label')).toContainText('Hoofdsteden');
});

test('set 70 — fase 2 #qtot toont 4 (hoofdsteden + Helsinki)', async ({ page }) => {
  test.setTimeout(30_000);
  await startPhaseQuiz(page);

  for (let i = 0; i < 4; i++) {
    await answerMCCorrectly(page);
  }

  await expect(page.locator('#phase-transition')).toBeVisible({ timeout: 5000 });
  await page.waitForFunction(() => {
    const t = document.getElementById('phase-transition');
    return !t || getComputedStyle(t).display === 'none';
  }, { timeout: 8000 });

  const tot = await page.locator('#qtot').textContent();
  expect(Number(tot)).toBe(4);
});

// ── Fase 3: wateren (stap 5) ──────────────────────────────────────────────────

async function waitForPhaseStart(page) {
  await page.waitForFunction(() => {
    const t = document.getElementById('phase-transition');
    if (t && getComputedStyle(t).display !== 'none') return false;
    const opts = document.querySelectorAll('.opt');
    return opts.length > 0 && !opts[0].disabled;
  }, { timeout: 15000 });
}

test('set 70 — na fases 1+2: fase 3 "Zeeën" gestart', async ({ page }) => {
  test.setTimeout(60_000);
  await startPhaseQuiz(page);
  for (let i = 0; i < 4; i++) await answerMCCorrectly(page);
  await waitForPhaseStart(page);
  for (let i = 0; i < 4; i++) await answerMCCorrectly(page);
  await waitForPhaseStart(page);
  await expect(page.locator('#question-text')).toHaveText('Welk water is dit?', { timeout: 5000 });
  await expect(page.locator('#phase-label')).toContainText('Zeeën');
});

test('set 70 — fase 3: #qtot toont 4 (Baltische wateren)', async ({ page }) => {
  test.setTimeout(60_000);
  await startPhaseQuiz(page);
  for (let i = 0; i < 4; i++) await answerMCCorrectly(page);
  await waitForPhaseStart(page);
  for (let i = 0; i < 4; i++) await answerMCCorrectly(page);
  await waitForPhaseStart(page);
  const totW = await page.locator('#qtot').textContent();
  expect(Number(totW)).toBe(4);
});
