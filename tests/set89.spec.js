/**
 * Set 89 — Midden-Amerika en Caraïben (issue #57)
 *
 * Common smoke-tests (menu-visible, mode-select, fase-1 vraag/label/qtot/zoom)
 * zitten in tests/set-smoke.spec.js. Hier alleen set-specifieke regressies.
 */

const { test, expect } = require('@playwright/test');

async function openSet89(page) {
  await page.goto('/');
  await page.locator('.group-btn', { hasText: '8' }).click();
  await page.locator('#level-select .mode-btn', { hasText: '8.9' }).click();
  await expect(page.locator('#mode-select')).toBeVisible();
}

async function startSet89MC(page) {
  await openSet89(page);
  await page.locator('#mode-select .mode-btn', { hasText: 'Meerkeuze' }).click();
  await page.waitForSelector('#question-text');
}

test('set 89 — alle 11 landen in landen-midden-amerika.geojson', async ({ page }) => {
  await page.goto('/');
  const names = await page.evaluate(async () => {
    const data = await fetch('/landen-midden-amerika.geojson').then(r => r.json());
    return data.features.map(f => f.properties.name);
  });
  const expected = ['Cuba','Jamaica','Haïti','Dominicaanse Republiek',
                    'Guatemala','Belize','Honduras','El Salvador',
                    'Nicaragua','Costa Rica','Panama'];
  expected.forEach(n => expect(names).toContain(n));
});

test('set 89 — Antillen in eilanden-midden-amerika.geojson als polygoon', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/eilanden-midden-amerika.geojson').then(r => r.json());
    return data.features.map(f => ({
      name: f.properties.name,
      type: f.geometry.type,
      sets: f.properties.sets,
    }));
  });
  for (const naam of ['Aruba','Curaçao','Bonaire','Sint Maarten','Saba','Sint Eustatius']) {
    const f = info.find(x => x.name === naam);
    expect(f).toBeDefined();
    expect(['Polygon','MultiPolygon']).toContain(f.type);
    expect(f.sets).toContain(89);
  }
});

test('set 89 — 6 Antillen: alle als echte polygon (consistent)', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const inSet = ALL_PROVINCES.filter(p => p.sets?.includes(89));
    return {
      count: inSet.length,
      byName: Object.fromEntries(inSet.map(p => [p.name, { kind: p.kind, shape: p.shape || null }])),
    };
  });
  expect(result.count).toBe(6);
  for (const naam of ['Aruba','Curaçao','Bonaire','Sint Maarten','Saba','Sint Eustatius']) {
    expect(result.byName[naam]).toEqual({ kind: 'eiland', shape: null });
  }
});

test('set 89 — 2 hoofdsteden: Havana + Willemstad', async ({ page }) => {
  await page.goto('/');
  const caps = await page.evaluate(() => {
    return ALL_CITIES
      .filter(c => c.sets?.includes(89) && c.capital)
      .map(c => c.name).sort();
  });
  expect(caps).toEqual(['Havana','Willemstad']);
});

test('set 89 — wateren: Caribische Zee + Panamakanaal + Atlantische + Grote Oceaan', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    return ALL_WATERS
      .filter(w => w.sets?.includes(89))
      .map(w => ({
        name: w.name,
        shape: w.shape || null,
        override: w.posBySet?.[89] || null,
      }))
      .sort((a,b) => a.name.localeCompare(b.name));
  });
  expect(result.map(r => r.name)).toEqual(['Atlantische Oceaan','Caribische Zee','Grote Oceaan','Panamakanaal']);
  // Atlantische en Grote Oceaan hebben posBySet-override voor set 89
  const atl = result.find(r => r.name === 'Atlantische Oceaan');
  expect(atl.shape).toBe('fuzzy');
  expect(atl.override).not.toBeNull();
  expect(atl.override.lat).toBeGreaterThan(10);
  expect(atl.override.lat).toBeLessThan(30);
  const gr = result.find(r => r.name === 'Grote Oceaan');
  expect(gr.shape).toBe('fuzzy');
  expect(gr.override).not.toBeNull();
  // Grote Oceaan voor set 89: centrum west van Midden-Amerika (lon < -85)
  expect(gr.override.lon).toBeLessThan(-85);
});

test('set 89 — Atlantische Oceaan blijft ook in set 78 (gedeeld)', async ({ page }) => {
  await page.goto('/');
  const atl = await page.evaluate(() => {
    const w = ALL_WATERS.find(x => x.name === 'Atlantische Oceaan');
    return w ? { sets: w.sets, shape: w.shape || null } : null;
  });
  expect(atl).not.toBeNull();
  expect(atl.sets).toContain(78);
  expect(atl.sets).toContain(89);
  expect(atl.shape).toBe('fuzzy');
});

test('set 89 — eiland-fase vraagt "Welk eiland is dit?" (niet "provincie")', async ({ page }) => {
  await startSet89MC(page);
  // Start in landen-fase. Door fase heen klikken tot eilanden-fase (fase 3).
  // Quickest: deep-link direct naar fase 2 (0-indexed).
  await page.goto('/?set=89&mode=mc&phase=2');
  await page.waitForSelector('#question-text');
  await expect(page.locator('#question-text')).toHaveText('Welk eiland is dit?');
});

test('set 89 — Cuba reikt tot ~23°N (noord)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/landen-midden-amerika.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Cuba');
    if (!f) return null;
    let maxLat = -Infinity;
    const walk = (arr) => {
      if (typeof arr[0] === 'number') { if (arr[1] > maxLat) maxLat = arr[1]; }
      else arr.forEach(walk);
    };
    walk(f.geometry.coordinates);
    return { type: f.geometry.type, maxLat };
  });
  expect(info).not.toBeNull();
  expect(info.maxLat).toBeGreaterThan(22);
});
