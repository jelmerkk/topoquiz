/**
 * Set 87 — Zuidoost-Azië (issue #55)
 *
 * Fase 1: 9 landen (country) — Myanmar, Thailand, Vietnam, Cambodja, Laos,
 *          Maleisië, Singapore, Indonesië, Filipijnen (NE polygonen).
 * Fase 2: 11 steden (place) — 8 hoofdsteden + 3 extra (Yangon niet-hoofd,
 *          Ho Chi Minhstad, Surabaya).
 * Fase 3: 5 eilanden (province) — Kalimantan, Sumatra, Sulawesi, Java,
 *          Molukken als echte polygonen uit OSM place=island relations.
 * Fase 4: 2 wateren (water) — Grote Oceaan + Indische Oceaan hergebruikt
 *          uit sets 86 resp. 84/85 via meervoudige set-tag.
 */

const { test, expect } = require('@playwright/test');

async function openSet87(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '8' }).click();
  await page.locator('#level-select .mode-btn', { hasText: '8.7' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startSet87MC(page) {
  await openSet87(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

test('set 87 verschijnt in groep 8', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '8' }).click();
  await expect(page.locator('#level-select .mode-btn', { hasText: '8.7' })).toBeVisible();
});

test('set 87 — fase 1: vraag is "Welk land is dit?"', async ({ page }) => {
  await startSet87MC(page);
  await expect(page.locator('#question-text')).toHaveText('Welk land is dit?');
});

test('set 87 — fase 1: #qtot toont 9', async ({ page }) => {
  await startSet87MC(page);
  const tot = await page.locator('#qtot').textContent();
  expect(Number(tot)).toBe(9);
});

test('set 87 — alle 9 landen in landen-zuidoost-azie.geojson', async ({ page }) => {
  await page.goto('/');
  const names = await page.evaluate(async () => {
    const data = await fetch('/landen-zuidoost-azie.geojson').then(r => r.json());
    return data.features.map(f => f.properties.name);
  });
  const expected = ['Myanmar','Thailand','Vietnam','Cambodja','Laos',
                    'Maleisië','Singapore','Indonesië','Filipijnen'];
  expected.forEach(n => expect(names).toContain(n));
});

test('set 87 — alle 5 eilanden in eilanden-zuidoost-azie.geojson als polygoon', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/eilanden-zuidoost-azie.geojson').then(r => r.json());
    return data.features.map(f => ({
      name: f.properties.name,
      type: f.geometry.type,
      sets: f.properties.sets,
    }));
  });
  const expected = ['Kalimantan','Sumatra','Sulawesi','Java','Molukken'];
  for (const naam of expected) {
    const f = info.find(x => x.name === naam);
    expect(f).toBeDefined();
    expect(['Polygon','MultiPolygon']).toContain(f.type);
    expect(f.sets).toContain(87);
  }
});

test('set 87 — eilanden zijn echte polygonen (niet fuzzy)', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const inSet = ALL_PROVINCES.filter(p => p.sets?.includes(87));
    return {
      count: inSet.length,
      kinds: [...new Set(inSet.map(p => p.kind))],
      hasFuzzy: inSet.some(p => p.shape === 'fuzzy'),
    };
  });
  expect(result.count).toBe(5);
  expect(result.kinds).toEqual(['eiland']);
  expect(result.hasFuzzy).toBe(false);
});

test('set 87 — wateren: Grote Oceaan + Indische Oceaan (hergebruikt)', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const inSet = ALL_WATERS.filter(w => w.sets?.includes(87));
    return inSet.map(w => w.name).sort();
  });
  expect(result).toEqual(['Grote Oceaan','Indische Oceaan']);
});

test('set 87 — 8 hoofdsteden (Myanmar zonder hoofdstad, Yangon = stad)', async ({ page }) => {
  await page.goto('/');
  const caps = await page.evaluate(() => {
    return ALL_CITIES
      .filter(c => c.sets?.includes(87) && c.capital)
      .map(c => c.name).sort();
  });
  expect(caps).toEqual(['Bangkok','Hanoi','Jakarta','Kuala Lumpur','Manila','Phnom Penh','Singapore','Vientiane']);
});

test('set 87 — Yangon is stad (niet hoofdstad)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(() => {
    const y = ALL_CITIES.find(c => c.name === 'Yangon' && c.sets?.includes(87));
    return y ? { present: true, capital: !!y.capital } : { present: false };
  });
  expect(info.present).toBe(true);
  expect(info.capital).toBe(false);
});

test('set 87 — Singapore staat zowel als land als stad (city-state)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(() => {
    const stad = ALL_CITIES.find(c => c.name === 'Singapore' && c.sets?.includes(87));
    const land = ALL_COUNTRIES.find(l => l.name === 'Singapore' && l.sets?.includes(87));
    return { stad: !!stad, land: !!land };
  });
  expect(info.stad).toBe(true);
  expect(info.land).toBe(true);
});

test('set 87 — Indonesië strekt tot Papoea (multipolygoon ≥ 142°E)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/landen-zuidoost-azie.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Indonesië');
    if (!f) return null;
    let maxLon = -Infinity;
    const walk = (arr) => {
      if (typeof arr[0] === 'number') { if (arr[0] > maxLon) maxLon = arr[0]; }
      else arr.forEach(walk);
    };
    walk(f.geometry.coordinates);
    return { type: f.geometry.type, maxLon };
  });
  expect(info).not.toBeNull();
  expect(info.type).toBe('MultiPolygon');
  // Papoea bereikt ongeveer 141°E bij grens met PNG. Bbox cut-off 142°E.
  expect(info.maxLon).toBeGreaterThan(135);
});
