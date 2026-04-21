/**
 * Set 82 — Afrika (issue #50)
 *
 * Common smoke-tests (menu-visible, mode-select, fase-1 vraag/label/qtot/zoom)
 * zitten in tests/set-smoke.spec.js. Hier alleen set-specifieke regressies.
 */

const { test, expect } = require('@playwright/test');

test('set 82 — alle 13 landen in landen-afrika.geojson', async ({ page }) => {
  await page.goto('/');
  const names = await page.evaluate(async () => {
    const data = await fetch('/landen-afrika.geojson').then(r => r.json());
    return data.features.map(f => f.properties.name);
  });
  const expected = ['Marokko','Algerije','Tunesië','Egypte','Sudan','Ethiopië',
                    'Kenia','Tanzania','Nigeria','Ghana','Senegal','DR Congo','Zuid-Afrika'];
  expected.forEach(n => expect(names).toContain(n));
});

test('set 82 — Nijl LineString loopt zuid→noord (brontoe→Middellandse Zee)', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Nijl' && x.properties.sets?.includes(82));
    if (!f) return null;
    const c = f.geometry.coordinates;
    return { type: f.geometry.type, npts: c.length,
             startLat: c[0][1], endLat: c[c.length-1][1] };
  });
  expect(info).not.toBeNull();
  expect(info.type).toBe('LineString');
  // Nijl stroomt naar het noorden — eindpunt (delta) noordelijker dan bron.
  // OSM Q3392 is de "Nijl proper" vanaf samenvloeiing in Khartoem (~16°N)
  // tot delta (~30°N); Witte/Blauwe Nijl zijn aparte relaties. Span ~14°.
  expect(info.endLat - info.startLat).toBeGreaterThan(10);
});

test('set 82 — Victoriameer is Polygon/MultiPolygon op evenaar', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const data = await fetch('/wateren.geojson').then(r => r.json());
    const f = data.features.find(x => x.properties.name === 'Victoriameer' && x.properties.sets?.includes(82));
    if (!f) return null;
    // Grootste ring nemen voor bbox.
    const rings = f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates[0];
    const coords = rings[0];
    const lats = coords.map(c => c[1]), lons = coords.map(c => c[0]);
    return { type: f.geometry.type, cy: (Math.min(...lats)+Math.max(...lats))/2,
             cx: (Math.min(...lons)+Math.max(...lons))/2 };
  });
  expect(info).not.toBeNull();
  expect(['Polygon','MultiPolygon']).toContain(info.type);
  // Victoriameer ligt rond de evenaar (~ -1°N tot -3°S) en 32-35°E.
  expect(info.cy).toBeGreaterThan(-3);
  expect(info.cy).toBeLessThan(1);
  expect(info.cx).toBeGreaterThan(31);
  expect(info.cx).toBeLessThan(36);
});
