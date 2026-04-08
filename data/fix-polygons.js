#!/usr/bin/env node
// Applies targeted fixes to wateren.geojson:
//   - Noordzee: replaces the SW sea-jump with actual Zeeland outer coast waypoints
//   - Eemsmonding: OSM relation 13883164 (Ems-Dollard Treaty area, full estuary)
//   - Oosterschelde: OSM relation 6846427 (outer boundary)
//   - Westerschelde: OSM relation 9745220 (outer boundary)
// Waddenzee is kept unchanged.

const fs   = require('fs');
const path = require('path');

const geojson = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../wateren.geojson'), 'utf8'
));
const chains = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'overpass/processed-coastlines.json'), 'utf8'
));

// ── RDP simplification ───────────────────────────────────────────────────────
function perpendicularDist(p, a, b) {
  const dx = b[0]-a[0], dy = b[1]-a[1];
  if (dx===0 && dy===0) return Math.hypot(p[0]-a[0], p[1]-a[1]);
  const t = ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / (dx*dx+dy*dy);
  return Math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy));
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let maxD = 0, maxI = 0;
  for (let i = 1; i < pts.length-1; i++) {
    const d = perpendicularDist(pts[i], pts[0], pts[pts.length-1]);
    if (d > maxD) { maxD = d; maxI = i; }
  }
  if (maxD > eps) return [...rdp(pts.slice(0, maxI+1), eps).slice(0,-1), ...rdp(pts.slice(maxI), eps)];
  return [pts[0], pts[pts.length-1]];
}

const get = name => geojson.features.find(f => f.properties.name === name);
const close = coords => [...coords, coords[0]];
const rev   = coords => [...coords].reverse();

// ── 1. NOORDZEE SW corner fix ────────────────────────────────────────────────
// Problem: existing polygon jumps from [3.37,51.37] (Westerschelde mouth) out
// to sea [3.3,51.45] → [3.35,51.55] → [3.5,51.7] — missing all of Zeeland.
// Fix: remove those 3 sea-jump points, insert actual outer Zeeland coast.
//
// Outer Zeeland coast from S→N (Vlissingen → Westkapelle → Schouwen → Goeree):
const zeelandOuter = [
  [3.57, 51.44],  // Vlissingen (SW Walcheren, start of outer coast going north)
  [3.44, 51.53],  // Westkapelle (NW tip of Walcheren)
  [3.63, 51.63],  // N Walcheren / Neeltje Jans (Oosterscheldekering entrance)
  [3.82, 51.72],  // Burgh-Haamstede (N Schouwen)
  [3.92, 51.76],  // NE Schouwen, approaching Goeree
];

const noordzeeFeature = get('Noordzee');
const nzCoords = noordzeeFeature.geometry.coordinates[0];
// Existing: [3.37,51.37], [3.3,51.45], [3.35,51.55], [3.5,51.7], [3.65,51.82], ...
// Remove indices 1-3 (sea-jump), insert zeelandOuter after index 0
const nzFixed = close([
  nzCoords[0],         // [3.37,51.37] — Westerschelde mouth, keep
  ...zeelandOuter,     // actual Zeeland outer coast
  ...nzCoords.slice(4, -1), // from [3.65,51.82] onward (excluding closing point)
]);
console.log(`Noordzee: ${nzCoords.length} pts → ${nzFixed.length} pts`);
noordzeeFeature.geometry.coordinates[0] = nzFixed;

// ── 2. EEMSMONDING — OSM relation 13883164 (Eemsmonding / Emsmündung) ────────
// Ems-Dollard Treaty area: 57 outer ways, covers full Ems Estuary
// lon 6.32–7.25°E, lat 53.23–53.63°N (Borkum to Dollard).
const eemsNew = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'overpass', 'eemsmonding-processed.json'), 'utf8'
));
console.log(`Eemsmonding: OSM relation 13883164 → ${eemsNew.length} pts`);

const eemsFeature = get('Eems');
eemsFeature.geometry.coordinates[0] = eemsNew;

// ── 3. OOSTERSCHELDE — OSM relation 6846427 ─────────────────────────────────
// 28 outer ways chained + RDP (eps=0.002) → 199 pts.
// Inner ways (60 islands/land) are ignored — outer boundary only.
const oosterscheldeNew = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'overpass', 'oosterschelde-processed.json'), 'utf8'
));
console.log(`Oosterschelde: OSM relation → ${oosterscheldeNew.length} pts`);

const oosterscheldeFeature = get('Oosterschelde');
oosterscheldeFeature.geometry.coordinates[0] = oosterscheldeNew;

// ── 4. WESTERSCHELDE — OSM relation 10310085 (Westerschelde & Saeftinghe) ───
// Nature reserve outer ring: 12 of 26 outer ways chain into a closed polygon
// covering the full estuary lon 3.36–4.25°E. Other 14 ways are inlets (unused).
// RDP eps=0.002 → 108 pts.
const westerscheldeNew = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'overpass', 'westerschelde-processed.json'), 'utf8'
));
console.log(`Westerschelde: Saeftinghe nature reserve outer ring → ${westerscheldeNew.length} pts`);

const westerscheldeFeature = get('Westerschelde');
westerscheldeFeature.geometry.coordinates[0] = westerscheldeNew;

// ── Write output ─────────────────────────────────────────────────────────────
fs.writeFileSync(
  path.join(__dirname, '../wateren.geojson'),
  JSON.stringify(geojson, null, 2)
);
console.log('\nSaved to wateren.geojson');
