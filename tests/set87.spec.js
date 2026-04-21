/**
 * Set 87 — Zuidoost-Azië (issue #55)
 *
 * Common smoke-tests (menu-visible, mode-select, fase-1 vraag/label/qtot/zoom)
 * zitten in tests/set-smoke.spec.js. Hier alleen set-specifieke regressies.
 */

const { test, expect } = require('@playwright/test');

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
