#!/usr/bin/env node
// Issue #54: processeer OAZ-wateren → features in wateren.geojson (sets:[86]).
//   Huang He    Q7355 → main_stream LineString (Tibet W → Bohai-zee O)
//   Chang Jiang Q5413 → main_stream LineString (Tibet W → Shanghai/Oost-Chinese Zee O)
//
// Beide rivieren starten op het Tibetaans plateau en stromen oostelijk af.

const fs   = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'overpass');
const DEST    = path.join(__dirname, '..', 'wateren.geojson');

function dist(a, b) { return Math.hypot(a[0]-b[0], a[1]-b[1]); }

function perpendicularDist(p, a, b) {
  const dx = b[0]-a[0], dy = b[1]-a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0]-a[0], p[1]-a[1]);
  const t = ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / (dx*dx + dy*dy);
  return Math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy));
}

function rdp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = 1; keep[pts.length-1] = 1;
  const stack = [[0, pts.length-1]];
  while (stack.length) {
    const [lo, hi] = stack.pop();
    if (hi <= lo + 1) continue;
    let maxD = 0, maxI = -1;
    for (let i = lo+1; i < hi; i++) {
      const d = perpendicularDist(pts[i], pts[lo], pts[hi]);
      if (d > maxD) { maxD = d; maxI = i; }
    }
    if (maxD > eps && maxI !== -1) {
      keep[maxI] = 1;
      stack.push([lo, maxI]); stack.push([maxI, hi]);
    }
  }
  const out = [];
  for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]);
  return out;
}

function chain(ways, maxGap = 0.05) {
  const segs = ways.map(w => w.geometry.map(n => [n.lon, n.lat]));
  if (segs.length === 0) return [];
  if (segs.length === 1) return segs[0];

  const result = [...segs[0]];
  const used = new Set([0]);

  let progressed = true;
  while (progressed && used.size < segs.length) {
    progressed = false;
    const tail = result[result.length-1];
    let bestIdx = -1, reversed = false, bestDist = Infinity;
    for (let i = 0; i < segs.length; i++) {
      if (used.has(i)) continue;
      const s = segs[i], d1 = dist(tail, s[0]), d2 = dist(tail, s[s.length-1]);
      if (d1 < bestDist) { bestDist = d1; bestIdx = i; reversed = false; }
      if (d2 < bestDist) { bestDist = d2; bestIdx = i; reversed = true; }
    }
    if (bestIdx !== -1 && bestDist <= maxGap) {
      const seg = reversed ? [...segs[bestIdx]].reverse() : segs[bestIdx];
      result.push(...seg.slice(1));
      used.add(bestIdx);
      progressed = true;
      continue;
    }
    const head = result[0];
    bestIdx = -1; reversed = false; bestDist = Infinity;
    for (let i = 0; i < segs.length; i++) {
      if (used.has(i)) continue;
      const s = segs[i], d1 = dist(head, s[0]), d2 = dist(head, s[s.length-1]);
      if (d1 < bestDist) { bestDist = d1; bestIdx = i; reversed = true; }
      if (d2 < bestDist) { bestDist = d2; bestIdx = i; reversed = false; }
    }
    if (bestIdx !== -1 && bestDist <= maxGap) {
      const seg = reversed ? [...segs[bestIdx]].reverse() : segs[bestIdx];
      result.unshift(...seg.slice(0, -1));
      used.add(bestIdx);
      progressed = true;
    }
  }
  return result;
}

function roundCoords(pts, digits = 4) {
  const f = Math.pow(10, digits);
  return pts.map(([x, y]) => [Math.round(x*f)/f, Math.round(y*f)/f]);
}

function processRiver(file, name, eps, orientFn, maxGap = 0.1) {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, file), 'utf8'));
  const rel = raw.elements.find(e => e.type === 'relation');
  const ways = rel.members.filter(m =>
    m.type === 'way' && m.geometry && m.role === 'main_stream');
  const chained = chain(ways, maxGap);
  const simp = roundCoords(rdp(chained, eps));
  if (orientFn && orientFn(simp) === false) simp.reverse();
  console.log(`  ${name.padEnd(14)} ways=${ways.length} chain=${chained.length} rdp(${eps})=${simp.length}`);
  return { type: 'LineString', coordinates: simp };
}

const features = [
  // Huang He (Gele Rivier): bron Bayan Har-gebergte (~35°N/96°E), monding
  // Bohai-zee (~38°N/119°E). W→O, start westelijker dan eind.
  { name: 'Huang He', geom: processRiver('huang-he.json', 'Huang He', 0.025,
      s => s[0][0] < s[s.length-1][0], 0.5) },

  // Chang Jiang (Yangtze): bron Tanggula-gebergte (~33°N/91°E), monding bij
  // Shanghai (~31°N/121°E). W→O, start westelijker dan eind.
  { name: 'Chang Jiang', geom: processRiver('chang-jiang.json', 'Chang Jiang', 0.025,
      s => s[0][0] < s[s.length-1][0], 0.5) },
];

const gj = JSON.parse(fs.readFileSync(DEST, 'utf8'));

for (const { name, geom } of features) {
  const feature = {
    type: 'Feature',
    properties: { name, sets: [86] },
    geometry: geom,
  };
  const idx = gj.features.findIndex(f => f.properties.name === name);
  if (idx >= 0) { gj.features[idx] = feature; }
  else { gj.features.push(feature); }
}

fs.writeFileSync(DEST, JSON.stringify(gj));
const size = fs.statSync(DEST).size;
console.log(`\n✓ wateren.geojson bijgewerkt (${gj.features.length} features, ${Math.round(size/1024)} KB)`);
