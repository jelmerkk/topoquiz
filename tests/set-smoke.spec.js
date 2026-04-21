/**
 * Parametrized smoke-suite voor alle per-set specs.
 *
 * Vervangt de common tests uit tests/set{58,71-79,81-89}.spec.js:
 *   A. menu-visibility  — verschijnt in de juiste groep
 *   B. mode-select      — reachable via label-klik
 *   C. phase-1 vraag    — #question-text toont de juiste vraag-zin
 *   D. phase-1 label    — #phase-label bevat de juiste fase-naam
 *   E. phase-1 qtot     — #qtot toont het juiste aantal items (of ≥ qtotMin)
 *   F. phase-1 zoom     — kaartzoom valt binnen [min, max]
 *
 * Set-specifieke tests (data-integriteit, regressies, multi-fase doorloop)
 * blijven in hun eigen set*.spec.js files.
 *
 * Sets 57 (wateren, klik-only) + 67 (Noord-Holland, minimaal) hebben geen
 * phase-1-MC-smoke en staan niet in deze fixture.
 */

const { test, expect } = require('@playwright/test');

// ── Fixture ────────────────────────────────────────────────────────────────
// Ontbrekende velden = test wordt niet gegenereerd.
// qtot = exact (toBe); qtotMin = lower-bound (≥, voor sets met dynamische items).

const SETS = [
  { setId: 58, group: 5, label: 'Onze buren',            q: 'Welk land is dit?',   phaseLabel: 'Landen', qtot: 16, zoom: [3, 7] },
  { setId: 71, group: 7, label: 'Landen en hoofdsteden', q: 'Welk land is dit?',   phaseLabel: 'Landen', qtot: 20 },
  { setId: 72, group: 7, label: 'België',                q: 'Welk gewest is dit?',                       qtot: 4 },
  { setId: 73, group: 7, label: 'Frankrijk',             q: 'Welke plaats is dit?', phaseLabel: 'Steden', qtotMin: 18, zoom: [4, 7] },
  { setId: 74, group: 7, label: 'Duitsland',             q: 'Welke plaats is dit?', phaseLabel: 'Steden', qtot: 18, zoom: [4, 7] },
  { setId: 75, group: 7, label: 'Verenigd Koninkrijk',   q: 'Welke regio is dit?',  phaseLabel: 'Regio', qtot: 5,  zoom: [4, 7] },
  { setId: 76, group: 7, label: 'Midden-Europa',         q: 'Welke plaats is dit?', phaseLabel: 'Steden', qtot: 22 },
  { setId: 77, group: 7, label: '7.7',                   q: 'Welk land is dit?',    phaseLabel: 'Landen', qtot: 13 },
  { setId: 78, group: 7, label: '7.8',                   q: 'Welk land is dit?',    phaseLabel: 'Landen', qtot: 4 },
  { setId: 79, group: 7, label: '7.9',                   q: 'Welk land is dit?',                         qtot: 13 },
  { setId: 81, group: 8, label: '8.1',                   q: 'Welk land is dit?',                         qtot: 11 },
  { setId: 82, group: 8, label: '8.2',                   q: 'Welk land is dit?',                         qtot: 13 },
  { setId: 83, group: 8, label: '8.3',                   q: 'Welk land is dit?',                         qtot: 7 },
  { setId: 84, group: 8, label: '8.4',                   q: 'Welk land is dit?',                         qtot: 13 },
  { setId: 85, group: 8, label: '8.5',                   q: 'Welk land is dit?',                         qtot: 8 },
  { setId: 86, group: 8, label: '8.6',                   q: 'Welk land is dit?',                         qtot: 7 },
  { setId: 87, group: 8, label: '8.7',                   q: 'Welk land is dit?',                         qtot: 9 },
  { setId: 88, group: 8, label: '8.8',                   q: 'Welk land is dit?',                         qtot: 3 },
  { setId: 89, group: 8, label: '8.9',                   q: 'Welk land is dit?',                         qtot: 11 },
];

// ── Helpers ────────────────────────────────────────────────────────────────

async function openSet(page, group, label) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: String(group) }).click();
  await page.locator('#level-select .mode-btn', { hasText: label }).click();
}

async function startMC(page, group, label) {
  await openSet(page, group, label);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

// ── Generator ──────────────────────────────────────────────────────────────

for (const s of SETS) {
  test.describe(`set ${s.setId} (${s.label})`, () => {
    // A
    test(`verschijnt in groep ${s.group}`, async ({ page }) => {
      await page.goto('/');
      await page.locator('.group-btn', { hasText: String(s.group) }).click();
      await expect(page.locator('#level-select .mode-btn', { hasText: s.label })).toBeVisible();
    });

    // B
    test('mode-select bereikbaar', async ({ page }) => {
      await openSet(page, s.group, s.label);
      await expect(page.locator('#mode-select')).toBeVisible();
    });

    // C
    if (s.q) {
      test(`fase 1: vraag is "${s.q}"`, async ({ page }) => {
        await startMC(page, s.group, s.label);
        await expect(page.locator('#question-text')).toHaveText(s.q);
      });
    }

    // D
    if (s.phaseLabel) {
      test(`fase 1: faseslabel bevat "${s.phaseLabel}"`, async ({ page }) => {
        await startMC(page, s.group, s.label);
        await expect(page.locator('#phase-label')).toContainText(s.phaseLabel);
      });
    }

    // E
    if (s.qtot != null) {
      test(`fase 1: #qtot toont ${s.qtot}`, async ({ page }) => {
        await startMC(page, s.group, s.label);
        const tot = await page.locator('#qtot').textContent();
        expect(Number(tot)).toBe(s.qtot);
      });
    } else if (s.qtotMin != null) {
      test(`fase 1: #qtot ≥ ${s.qtotMin}`, async ({ page }) => {
        await startMC(page, s.group, s.label);
        const tot = await page.locator('#qtot').textContent();
        expect(Number(tot)).toBeGreaterThanOrEqual(s.qtotMin);
      });
    }

    // F
    if (s.zoom) {
      test(`fase 1: kaartzoom in [${s.zoom[0]}, ${s.zoom[1]}]`, async ({ page }) => {
        await startMC(page, s.group, s.label);
        const zoom = await page.evaluate(() => map.getZoom());
        expect(zoom).toBeGreaterThanOrEqual(s.zoom[0]);
        expect(zoom).toBeLessThanOrEqual(s.zoom[1]);
      });
    }
  });
}
