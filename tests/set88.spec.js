/**
 * Set 88 — Australië en Oceanië (issue #56)
 *
 * Fase 1: 3 landen (country) — Australië, Nieuw-Zeeland, Papoea-Nieuw-Guinea
 *          als NE-polygonen in landen-oceanie.geojson.
 * Fase 2: 10 steden (place) — 3 hoofdsteden (Canberra/Wellington/Port Moresby)
 *          + 7 grote niet-hoofdsteden.
 * Fase 3: 3 gebieden (province) — Tasmanië (echte polygoon), Grote Victoria-
 *          Woestijn (fuzzy ellips), Antarctica (echte polygoon continent).
 * Fase 4: 2 wateren (water) — Grote Oceaan + Indische Oceaan via posBySet-
 *          override zodat ellipsen voor Oceanie-perspectief gecentreerd staan.
 */

const { test, expect } = require('@playwright/test');

async function openSet88(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '8' }).click();
  await page.locator('#level-select .mode-btn', { hasText: '8.8' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startSet88MC(page) {
  await openSet88(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

test('set 88 verschijnt in groep 8', async ({ page }) => {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '8' }).click();
  await expect(page.locator('#level-select .mode-btn', { hasText: '8.8' })).toBeVisible();
});

test('set 88 — fase 1: vraag is "Welk land is dit?"', async ({ page }) => {
  await startSet88MC(page);
  await expect(page.locator('#question-text')).toHaveText('Welk land is dit?');
});

test('set 88 — fase 1: #qtot toont 3', async ({ page }) => {
  await startSet88MC(page);
  const tot = await page.locator('#qtot').textContent();
  expect(Number(tot)).toBe(3);
});

test('set 88 — alle 3 landen in landen-oceanie.geojson', async ({ page }) => {
  await page.goto('/');
  const names = await page.evaluate(async () => {
    const data = await fetch('/landen-oceanie.geojson').then(r => r.json());
    return data.features.map(f => f.properties.name);
  });
  const expected = ['Australië','Nieuw-Zeeland','Papoea-Nieuw-Guinea'];
  expected.forEach(n => expect(names).toContain(n));
});

test('set 88 — Tasmanië + Antarctica in gebieden-oceanie.geojson als polygoon', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/gebieden-oceanie.geojson').then(r => r.json());
    return data.features.map(f => ({
      name: f.properties.name,
      type: f.geometry.type,
      sets: f.properties.sets,
    }));
  });
  for (const naam of ['Tasmanië','Antarctica']) {
    const f = info.find(x => x.name === naam);
    expect(f).toBeDefined();
    expect(['Polygon','MultiPolygon']).toContain(f.type);
    expect(f.sets).toContain(88);
  }
});

test('set 88 — 3 gebieden: Tasmanië/GVW/Antarctica met juiste kinds', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const inSet = ALL_PROVINCES.filter(p => p.sets?.includes(88));
    return {
      count: inSet.length,
      byName: Object.fromEntries(inSet.map(p => [p.name, { kind: p.kind, shape: p.shape || null }])),
    };
  });
  expect(result.count).toBe(3);
  expect(result.byName['Tasmanië']).toEqual({ kind: 'eiland', shape: null });
  expect(result.byName['Grote Victoria-Woestijn']).toEqual({ kind: 'gebied', shape: 'fuzzy' });
  expect(result.byName['Antarctica']).toEqual({ kind: 'gebied', shape: null });
});

test('set 88 — wateren: Grote Oceaan + Indische Oceaan met posBySet-override', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const inSet = ALL_WATERS.filter(w => w.sets?.includes(88));
    return inSet.map(w => ({ name: w.name, override: w.posBySet?.[88] || null })).sort((a,b) => a.name.localeCompare(b.name));
  });
  expect(result.map(r => r.name)).toEqual(['Grote Oceaan','Indische Oceaan']);
  // Beide overrides op zuidelijk halfrond (Oceanie-perspectief).
  for (const r of result) {
    expect(r.override).not.toBeNull();
    expect(r.override.lat).toBeLessThan(0);
    expect(r.override.rx).toBeGreaterThan(0);
    expect(r.override.ry).toBeGreaterThan(0);
  }
});

test('set 88 — 3 hoofdsteden: Canberra/Wellington/Port Moresby', async ({ page }) => {
  await page.goto('/');
  const caps = await page.evaluate(() => {
    return ALL_CITIES
      .filter(c => c.sets?.includes(88) && c.capital)
      .map(c => c.name).sort();
  });
  expect(caps).toEqual(['Canberra','Port Moresby','Wellington']);
});

test('set 88 — Sydney is stad (niet hoofdstad, bekende valkuil)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(() => {
    const s = ALL_CITIES.find(c => c.name === 'Sydney' && c.sets?.includes(88));
    return s ? { present: true, capital: !!s.capital } : { present: false };
  });
  expect(info.present).toBe(true);
  expect(info.capital).toBe(false);
});

test('set 88 — Auckland is stad (niet hoofdstad)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(() => {
    const a = ALL_CITIES.find(c => c.name === 'Auckland' && c.sets?.includes(88));
    return a ? { present: true, capital: !!a.capital } : { present: false };
  });
  expect(info.present).toBe(true);
  expect(info.capital).toBe(false);
});

test('set 88 — Australië reikt tot Tasmanië (MultiPolygon ≤ -40°S)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/landen-oceanie.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Australië');
    if (!f) return null;
    let minLat = Infinity;
    const walk = (arr) => {
      if (typeof arr[0] === 'number') { if (arr[1] < minLat) minLat = arr[1]; }
      else arr.forEach(walk);
    };
    walk(f.geometry.coordinates);
    return { type: f.geometry.type, minLat };
  });
  expect(info).not.toBeNull();
  expect(info.type).toBe('MultiPolygon');
  // Tasmanië zuidkust op ~-43.6°S.
  expect(info.minLat).toBeLessThan(-40);
});
