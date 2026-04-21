/**
 * Set 86 — Oost-Azië (issue #54)
 *
 * Common smoke-tests (menu-visible, mode-select, fase-1 vraag/label/qtot/zoom)
 * zitten in tests/set-smoke.spec.js. Hier alleen set-specifieke regressies.
 */

const { test, expect } = require('@playwright/test');

test('set 86 — alle 7 landen in landen-oost-azie.geojson', async ({ page }) => {
  await page.goto('/');
  const names = await page.evaluate(async () => {
    const data = await fetch('/landen-oost-azie.geojson').then(r => r.json());
    return data.features.map(f => f.properties.name);
  });
  const expected = ['Rusland','Mongolië','China','Japan',
                    'Noord-Korea','Zuid-Korea','Taiwan'];
  expected.forEach(n => expect(names).toContain(n));
});

test('set 86 — Rusland heeft volledige polygoon (≥2000 pts, Kaliningrad incluis)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/landen-oost-azie.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Rusland');
    if (!f) return null;
    // MultiPolygon of Polygon — totaal aantal punten
    let n = 0;
    const walk = (arr) => {
      if (typeof arr[0] === 'number') n++;
      else arr.forEach(walk);
    };
    walk(f.geometry.coordinates);
    // Check of Kaliningrad (ca. 20°E) erin zit
    let minLon = Infinity;
    const walkLon = (arr) => {
      if (typeof arr[0] === 'number') { if (arr[0] < minLon) minLon = arr[0]; }
      else arr.forEach(walkLon);
    };
    walkLon(f.geometry.coordinates);
    return { n, minLon };
  });
  expect(info).not.toBeNull();
  expect(info.n).toBeGreaterThanOrEqual(2000);
  expect(info.minLon).toBeLessThan(25); // Kaliningrad-enclave meegenomen
});

test('set 86 — Taiwan is LAND (niet als gebied)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/landen-oost-azie.geojson').then(r => r.json());
    const hasTaiwanAsCountry = data.features.some(f => f.properties.name === 'Taiwan');
    const taiwanCountry = ALL_COUNTRIES.find(c => c.name === 'Taiwan');
    const taiwanGebied   = ALL_PROVINCES.find(p => p.name === 'Taiwan');
    return {
      hasTaiwanAsCountry,
      inAllCountries: !!taiwanCountry,
      taiwanCountrySets: taiwanCountry?.sets ?? [],
      taiwanAsGebied: !!taiwanGebied,
    };
  });
  expect(info.hasTaiwanAsCountry).toBe(true);
  expect(info.inAllCountries).toBe(true);
  expect(info.taiwanCountrySets).toContain(86);
  expect(info.taiwanAsGebied).toBe(false);
});

test('set 86 — Huang He stroomt W→O (Tibet → Bohai)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Huang He' && x.properties.sets?.includes(86));
    if (!f) return null;
    const c = f.geometry.coordinates;
    return { type: f.geometry.type, npts: c.length,
             startLon: c[0][0], endLon: c[c.length-1][0] };
  });
  expect(info).not.toBeNull();
  expect(info.type).toBe('LineString');
  expect(info.startLon).toBeLessThan(info.endLon);
  expect(info.startLon).toBeLessThan(100);   // Bayan Har ~96°E
  expect(info.endLon).toBeGreaterThan(115);  // Bohai ~119°E
});

test('set 86 — Chang Jiang stroomt W→O (Yibin → Shanghai)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Chang Jiang' && x.properties.sets?.includes(86));
    if (!f) return null;
    const c = f.geometry.coordinates;
    return { type: f.geometry.type,
             startLon: c[0][0], endLon: c[c.length-1][0] };
  });
  expect(info).not.toBeNull();
  expect(info.type).toBe('LineString');
  expect(info.startLon).toBeLessThan(info.endLon);
  expect(info.endLon).toBeGreaterThan(120);  // Shanghai ~122°E
});

test('set 86 — gebieden-fase rendert 3 fuzzy features (Tibet, Gobi, Siberië)', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const inSet = ALL_PROVINCES.filter(p => p.sets?.includes(86));
    return {
      count: inSet.length,
      names: inSet.map(p => p.name).sort(),
      shapes: [...new Set(inSet.map(p => p.shape))],
    };
  });
  expect(result.count).toBe(3);
  expect(result.names).toEqual(['Gobi','Siberië','Tibet']);
  expect(result.shapes).toEqual(['fuzzy']);
});

test('set 86 — wateren: 2 LineStrings + 2 fuzzy zeeën (incl. Grote Oceaan)', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const inSet = ALL_WATERS.filter(w => w.sets?.includes(86));
    return {
      count: inSet.length,
      names: inSet.map(w => w.name).sort(),
      fuzzy: inSet.filter(w => w.shape === 'fuzzy').map(w => w.name).sort(),
    };
  });
  expect(result.count).toBe(4);
  expect(result.names).toEqual(['Chang Jiang','Grote Oceaan','Huang He','Zuid-Chinese Zee']);
  expect(result.fuzzy).toEqual(['Grote Oceaan','Zuid-Chinese Zee']);
});

test('set 86 — 5 hoofdsteden (Beijing, Tokyo, Ulaanbaatar, Pyongyang, Seoul)', async ({ page }) => {
  await page.goto('/');
  const caps = await page.evaluate(() => {
    return ALL_CITIES
      .filter(c => c.sets?.includes(86) && c.capital)
      .map(c => c.name).sort();
  });
  expect(caps).toEqual(['Beijing','Pyongyang','Seoul','Tokyo','Ulaanbaatar']);
});

test('set 86 — Hongkong aanwezig maar niet als hoofdstad', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(() => {
    const hk = ALL_CITIES.find(c => c.name === 'Hongkong' && c.sets?.includes(86));
    return hk ? { present: true, capital: !!hk.capital } : { present: false };
  });
  expect(info.present).toBe(true);
  expect(info.capital).toBe(false);
});

test('set 86 — Moskou en Taipei NIET in set 86', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(() => {
    const mos = ALL_CITIES.find(c => c.name === 'Moskou' && c.sets?.includes(86));
    const tai = ALL_CITIES.find(c => c.name === 'Taipei' && c.sets?.includes(86));
    return { moskou: !!mos, taipei: !!tai };
  });
  expect(info.moskou).toBe(false);
  expect(info.taipei).toBe(false);
});
