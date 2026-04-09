#!/usr/bin/env node
// Builds the OUTER (N-facing) coast outline of each Wadden island as the
// upper hull of all coastline points, then concatenates the 5 islands W→E
// (Texel → Vlieland → Terschelling → Ameland → Schiermonnikoog) into
// data/overpass/wadden-outer-coasts.json.
//
// Used by data/fix-polygons.js to close the Noordzee polygon along the
// real island N coasts instead of jumping diagonally across the Wadden Sea.
//
// Why convex/upper hull instead of chaining the OSM `natural=coastline` ways:
// the OSM data for these islands contains huge amounts of micro-detail
// (intertidal zones like Texel's De Slufter, Schiermonnikoog's salt marshes)
// that produce zigzag noise when chained. The upper hull naturally smooths
// these out and gives a clean ~10–15 point N-coast outline per island.

const fs   = require('fs');
const path = require('path');
const DIR  = path.join(__dirname, 'overpass');

// upperHull: Andrew's monotone chain — upper convex hull only.
// Input: array of [lon, lat] points (any order).
// Output: hull points sorted by lon ascending (W→E), forming the upper edge.
function upperHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], pts[i]) <= 0) {
      upper.pop();
    }
    upper.push(pts[i]);
  }
  // upper is currently E→W; reverse to W→E
  return upper.reverse();
}

function processIsland(name, filename, latFilter) {
  const fp = path.join(DIR, filename);
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let ways = raw.elements.filter(e => e.type === 'way' && e.geometry && e.geometry.length >= 2);
  // Drop mainland ways (Texel file extends to N-Holland coast).
  // Filter by MAX lat of the way — keeps only ways that reach Texel itself.
  if (latFilter) {
    ways = ways.filter(w => {
      const maxLat = Math.max(...w.geometry.map(n => n.lat));
      return latFilter(maxLat);
    });
  }
  // Flatten all coastline points
  const allPts = [];
  for (const w of ways) {
    for (const n of w.geometry) allPts.push([n.lon, n.lat]);
  }
  console.log(`\n── ${name} ── ${ways.length} ways, ${allPts.length} pts`);

  const hull = upperHull(allPts);
  console.log(`  upper hull: ${hull.length} pts (W→E: ${hull[0]} → ${hull[hull.length-1]})`);

  const rounded = hull.map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);
  return rounded;
}

// W→E order: Texel → Vlieland → Terschelling → Ameland → Schiermonnikoog
const ISLANDS = [
  { name: 'texel',           file: 'wadden-texel.json',           latFilter: lat => lat >= 53.0 },
  { name: 'vlieland',        file: 'wadden-vlieland.json',        latFilter: null },
  { name: 'terschelling',    file: 'wadden-terschelling.json',    latFilter: null },
  { name: 'ameland',         file: 'wadden-ameland.json',         latFilter: null },
  { name: 'schiermonnikoog', file: 'wadden-schiermonnikoog.json', latFilter: null },
];

const all = [];
for (const isl of ISLANDS) {
  const arc = processIsland(isl.name, isl.file, isl.latFilter);
  all.push(...arc);
}

const out = path.join(DIR, 'wadden-outer-coasts.json');
fs.writeFileSync(out, JSON.stringify(all, null, 2));
console.log(`\nTotal points: ${all.length}`);
console.log(`Saved to data/overpass/wadden-outer-coasts.json`);
