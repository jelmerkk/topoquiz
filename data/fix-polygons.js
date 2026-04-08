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
const noordzeeNew = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'overpass', 'noordzee-processed.json'), 'utf8'
));
console.log(`Noordzee: Dutch territorial sea (14011309) → ${noordzeeNew.length} pts`);
// Add Waddenzee as inner ring (hole) so the Waddenzee area is excluded from Noordzee.
// The Waddenzee polygon is already wound CCW (outer); for GeoJSON holes it should be CW,
// but our pointInPolygon does explicit inside-check on the ring regardless of winding.
const waddenzeeHole = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'overpass', 'waddenzee-processed.json'), 'utf8'
));
// Apply the same Eems-overlap clip we already use for the Waddenzee feature itself
{
  const CUT_LON = 6.83;
  let entryIdx = -1, exitIdx = -1;
  for (let i = 0; i < waddenzeeHole.length - 1; i++) {
    const a = waddenzeeHole[i], b = waddenzeeHole[i + 1];
    if (a[0] <= CUT_LON && b[0] > CUT_LON && entryIdx === -1) entryIdx = i;
    if (entryIdx !== -1 && exitIdx === -1 && a[0] > CUT_LON && b[0] <= CUT_LON) exitIdx = i + 1;
  }
  if (entryIdx !== -1 && exitIdx !== -1) {
    waddenzeeHole.splice(entryIdx + 1, exitIdx - entryIdx - 1);
  }
}
noordzeeFeature.geometry.coordinates = [noordzeeNew, waddenzeeHole];
console.log(`  + Waddenzee hole: ${waddenzeeHole.length} pts`);

// ── 2. EEMSMONDING — OSM relation 13883164 (Eemsmonding / Emsmündung) ────────
// Ems-Dollard Treaty area: 57 outer ways, covers full Ems Estuary
// lon 6.32–7.25°E, lat 53.23–53.63°N (Borkum to Dollard).
let eemsNew = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'overpass', 'eemsmonding-processed.json'), 'utf8'
));
// Clip the outer-estuary arc northwest of Eemshaven [6.84°E, 53.46°N].
// Keep everything south/southeast of Eemshaven.
// Strategy: find the first point that goes west of lon 6.84°E AND north of
// lat 53.45°N (= past Eemshaven into the outer estuary), and cut there.
// Resume at the last point coming back from the north that is south of 53.45°N.
{
  let entryIdx = -1, exitIdx = -1;
  for (let i = 0; i < eemsNew.length - 1; i++) {
    const p = eemsNew[i], q = eemsNew[i + 1];
    // Entry: first step that crosses into the northwest arc (lon drops west of 6.84, lat > 53.45)
    if (entryIdx === -1 && p[0] >= 6.84 && q[0] < 6.84 && q[1] > 53.45) entryIdx = i;
    // Exit: after entry, first point back south of 53.45°N coming in from the north
    if (entryIdx !== -1 && exitIdx === -1 && p[1] > 53.45 && q[1] <= 53.45) exitIdx = i + 1;
  }
  if (entryIdx !== -1 && exitIdx !== -1) {
    eemsNew = [...eemsNew.slice(0, entryIdx + 1), ...eemsNew.slice(exitIdx)];
    console.log(`  clipped outer-estuary arc at Eemshaven: removed ${exitIdx - entryIdx - 1} pts`);
  }
}
console.log(`Eems: OSM relation 13883164 → ${eemsNew.length} pts (clipped at Eemshaven)`);

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

// ── 5. WADDENZEE — OSM relation 5909370 (NL Waddenzee nature reserve) ────────
// 149 of 150 outer ways chained + RDP (eps=0.002) → 271 pts.
// Covers lon 4.72–7.21°E, lat 52.89–53.58°N (Texel to Eemsmonding).
// Post-clip: the polygon dips east into the Eems area (idx 43–92 trace the
// Delfzijl/Knock coast that is already covered by the Eems polygon).
// Clip by finding the single east-crossing and the single west-return at 6.83°E.
let waddenzeeNew = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'overpass', 'waddenzee-processed.json'), 'utf8'
));
{
  const CUT_LON = 6.83;
  let entryIdx = -1, exitIdx = -1;
  for (let i = 0; i < waddenzeeNew.length - 1; i++) {
    const a = waddenzeeNew[i], b = waddenzeeNew[i + 1];
    if (a[0] <= CUT_LON && b[0] > CUT_LON && entryIdx === -1) entryIdx = i;
    if (entryIdx !== -1 && exitIdx === -1 && a[0] > CUT_LON && b[0] <= CUT_LON) exitIdx = i + 1;
  }
  if (entryIdx !== -1 && exitIdx !== -1) {
    waddenzeeNew = [...waddenzeeNew.slice(0, entryIdx + 1), ...waddenzeeNew.slice(exitIdx)];
    console.log(`  clipped Eems overlap: removed idx ${entryIdx+1}–${exitIdx-1} (${exitIdx-entryIdx-1} pts)`);
  }
}
console.log(`Waddenzee: OSM relation 5909370 → ${waddenzeeNew.length} pts (after Eems clip)`);

const waddenzeeFeature = get('Waddenzee');
waddenzeeFeature.geometry.coordinates[0] = waddenzeeNew;

// ── Write output ─────────────────────────────────────────────────────────────
fs.writeFileSync(
  path.join(__dirname, '../wateren.geojson'),
  JSON.stringify(geojson, null, 2)
);
console.log('\nSaved to wateren.geojson');
