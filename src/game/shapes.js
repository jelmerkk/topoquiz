// Topografie Quiz — generated polygon shapes voor ALL_PROVINCES/ALL_WATERS (#95)
//
// Pure feature-builders. `entry` is een cities.js-record met `name`, `lat`, `lon`
// en shape-specifieke velden (`rx`/`ry`/`rot` voor fuzzy; `size` voor peak).
//
//   buildEllipseFeature(entry, activeSet)
//     → GeoJSON Polygon-feature (64-puntige ellips). Voor wateren en
//       "zachte" gebieden (zeeën, kuststroken, historische streken).
//       `activeSet` kiest optioneel een posBySet-override (bv. Grote Oceaan
//       staat in sets 86/87/88 op verschillende posities).
//
//   buildPeakFeature(entry)
//     → GeoJSON Polygon-feature (3-punts driehoek, punt omhoog). Voor
//       bergtoppen (Mount Everest e.d.) die als icoon op de kaart staan.
//
// Beide passen lon-scaling via cos(lat) toe zodat de vorm op Mercator visueel
// regelmatig blijft — anders zou de ellips of driehoek op hogere breedtegraden
// schuin-gerekt ogen.

export function buildEllipseFeature(entry, activeSet) {
  const o = (activeSet != null && entry.posBySet && entry.posBySet[activeSet]) || null;
  const lat = o?.lat ?? entry.lat;
  const lon = o?.lon ?? entry.lon;
  const rx  = o?.rx  ?? entry.rx;
  const ry  = o?.ry  ?? entry.ry;
  const rotDeg = o?.rot ?? entry.rot ?? 0;
  const N = 64;
  const coords = [];
  const rot = (rotDeg * Math.PI) / 180;
  const cosR = Math.cos(rot), sinR = Math.sin(rot);
  // Mercator rekt lengtegraden uit op basis van breedtegraad. Zonder cos(lat)-
  // compensatie zou een geroteerde ellips visueel schuin-getrokken zijn.
  const lonScale = rot === 0 ? 1 : 1 / Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * 2 * Math.PI;
    const vx = rx * Math.cos(a);
    const vy = ry * Math.sin(a);
    const dx = vx * cosR - vy * sinR;
    const dy = vx * sinR + vy * cosR;
    coords.push([lon + dx * lonScale, lat + dy]);
  }
  return {
    type: 'Feature',
    properties: { name: entry.name, sets: entry.sets, shape: 'fuzzy' },
    geometry: { type: 'Polygon', coordinates: [coords] },
  };
}

export function buildPeakFeature(entry) {
  const size = entry.size || 1.2;
  const h = size * 0.866;            // hoogte van gelijkzijdige driehoek
  const lonScale = 1 / Math.cos((entry.lat * Math.PI) / 180);
  const cx = entry.lon, cy = entry.lat;
  const top = [cx, cy + h * 2/3];
  const bl  = [cx - (size/2) * lonScale, cy - h * 1/3];
  const br  = [cx + (size/2) * lonScale, cy - h * 1/3];
  return {
    type: 'Feature',
    properties: { name: entry.name, sets: entry.sets, shape: 'peak' },
    geometry: { type: 'Polygon', coordinates: [[top, bl, br, top]] },
  };
}
