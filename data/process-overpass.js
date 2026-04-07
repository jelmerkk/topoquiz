#!/usr/bin/env node
// Converts Overpass API raw data → simplified [lon,lat] coordinate arrays
// for use in wateren.geojson.
//
// Algorithm:
//   1. Chain ways into one continuous polyline (matching endpoints)
//   2. Simplify with Ramer-Douglas-Peucker (epsilon in degrees)
//   3. Round to 4 decimal places
//
// Usage: node data/process-overpass.js

const fs   = require('fs');
const path = require('path');
const DIR  = path.join(__dirname, 'overpass');

// ── Ramer-Douglas-Peucker ──────────────────────────────────────
function perpendicularDist(p, a, b) {
  const dx = b[0]-a[0], dy = b[1]-a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0]-a[0], p[1]-a[1]);
  const t = ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / (dx*dx + dy*dy);
  return Math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy));
}

function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let maxD = 0, maxI = 0;
  for (let i = 1; i < pts.length-1; i++) {
    const d = perpendicularDist(pts[i], pts[0], pts[pts.length-1]);
    if (d > maxD) { maxD = d; maxI = i; }
  }
  if (maxD > eps) {
    return [...rdp(pts.slice(0, maxI+1), eps).slice(0,-1), ...rdp(pts.slice(maxI), eps)];
  }
  return [pts[0], pts[pts.length-1]];
}

// ── Chain ways into one polyline ───────────────────────────────
function chain(ways) {
  // Convert each way to [lon,lat] array
  const segs = ways.map(w => w.geometry.map(n => [n.lon, n.lat]));
  if (segs.length === 0) return [];
  if (segs.length === 1) return segs[0];

  const result = [...segs[0]];
  const used = new Set([0]);

  while (used.size < segs.length) {
    const tail = result[result.length-1];
    let bestIdx = -1, reversed = false, bestDist = Infinity;

    for (let i = 0; i < segs.length; i++) {
      if (used.has(i)) continue;
      const s = segs[i], d1 = dist(tail, s[0]), d2 = dist(tail, s[s.length-1]);
      if (d1 < bestDist) { bestDist = d1; bestIdx = i; reversed = false; }
      if (d2 < bestDist) { bestDist = d2; bestIdx = i; reversed = true; }
    }

    if (bestIdx === -1 || bestDist > 0.05) break; // gap too large — stop chaining
    const seg = reversed ? [...segs[bestIdx]].reverse() : segs[bestIdx];
    result.push(...seg.slice(1)); // skip duplicate endpoint
    used.add(bestIdx);
  }

  return result;
}

function dist(a, b) { return Math.hypot(a[0]-b[0], a[1]-b[1]); }

// ── Process one file ───────────────────────────────────────────
function process(filename, epsilon = 0.003) {
  const raw = JSON.parse(fs.readFileSync(path.join(DIR, filename), 'utf8'));
  if (!raw.elements?.length) return null;
  const chained = chain(raw.elements);
  const simplified = rdp(chained, epsilon);
  return simplified.map(([lon,lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);
}

// ── Main ───────────────────────────────────────────────────────
const RIVERS = [
  { key: 'Waal',                  file: 'waal.json',                 eps: 0.003 },
  { key: 'Neder-Rijn',            file: 'neder-rijn.json',           eps: 0.003 },
  { key: 'Lek',                   file: 'lek.json',                  eps: 0.003 },
  { key: 'IJssel',                file: 'ijssel.json',               eps: 0.003 },
  { key: 'Maas (noord)',          file: 'maas-north.json',           eps: 0.003 },
  { key: 'Maas (zuid)',           file: 'maas-south.json',           eps: 0.003 },
  { key: 'Bergse Maas',           file: 'bergse-maas.json',          eps: 0.003 },
  { key: 'Oude Maas',             file: 'oude-maas.json',            eps: 0.002 },
  { key: 'Nieuwe Waterweg',       file: 'nieuwe-waterweg.json',      eps: 0.002 },
  { key: 'Noordzeekanaal',        file: 'noordzeekanaal.json',       eps: 0.002 },
  { key: 'Amsterdam-Rijnkanaal',  file: 'amsterdam-rijnkanaal.json', eps: 0.002 },
];

const result = {};
for (const r of RIVERS) {
  try {
    const coords = process(r.file, r.eps);
    if (!coords) { console.log(`⚠  ${r.key}: no data`); continue; }
    result[r.key] = coords;
    console.log(`✓  ${r.key}: ${coords.length} pts`);
  } catch(e) { console.log(`✗  ${r.key}: ${e.message}`); }
}

fs.writeFileSync(path.join(__dirname, 'overpass', 'processed.json'), JSON.stringify(result, null, 2));
console.log('\nSaved to data/overpass/processed.json');
