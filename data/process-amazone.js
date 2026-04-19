#!/usr/bin/env node
// Issue #49: processeer Amazone-relation (Q3783) → LineString en voeg toe aan
// wateren.geojson met sets: [81].
// Strategie: alleen main_stream-ways chainen (side_stream = zijarmen/meanders,
// oogt rommelig op de kaart). RDP iteratief om stack overflow te voorkomen.

const fs   = require('fs');
const path = require('path');

const SRC  = path.join(__dirname, 'overpass', 'amazone.json');
const DEST = path.join(__dirname, '..', 'wateren.geojson');

function dist(a, b) { return Math.hypot(a[0]-b[0], a[1]-b[1]); }

function perpendicularDist(p, a, b) {
  const dx = b[0]-a[0], dy = b[1]-a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0]-a[0], p[1]-a[1]);
  const t = ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / (dx*dx + dy*dy);
  return Math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy));
}

// Iteratieve RDP.
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

// Greedy chain met exacte endpoint-match + maxGap-fallback.
function chain(ways, maxGap = 0.01) {
  const segs = ways.map(w => w.geometry.map(n => [n.lon, n.lat]));
  if (segs.length === 0) return [];
  if (segs.length === 1) return segs[0];

  const result = [...segs[0]];
  const used = new Set([0]);

  let progressed = true;
  while (progressed && used.size < segs.length) {
    progressed = false;
    // Verleng aan de staart.
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
    // Verleng aan de kop.
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

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const rel = raw.elements.find(e => e.type === 'relation');
if (!rel) { console.error('Geen relatie'); process.exit(1); }

const mainWays = rel.members.filter(m =>
  m.type === 'way' && m.geometry && m.role === 'main_stream');
console.log(`Main-stream ways: ${mainWays.length}`);

const chained = chain(mainWays, 0.05);
const simplified = rdp(chained, 0.01).map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);
console.log(`Chain: ${chained.length} pts → RDP(0.01) → ${simplified.length} pts`);

// Oriëntatie controleren: Amazone stroomt west→oost. Eerste punt moet
// westelijker zijn dan laatste; anders omkeren.
if (simplified[0][0] > simplified[simplified.length-1][0]) {
  simplified.reverse();
  console.log('Omgedraaid naar west→oost oriëntatie');
}
const [lon0, lat0] = simplified[0];
const [lonN, latN] = simplified[simplified.length-1];
console.log(`Start [${lon0}, ${lat0}] → Eind [${lonN}, ${latN}]`);

const gj = JSON.parse(fs.readFileSync(DEST, 'utf8'));
const feature = {
  type: 'Feature',
  properties: { name: 'Amazone', sets: [81] },
  geometry: { type: 'LineString', coordinates: simplified },
};
const idx = gj.features.findIndex(f => f.properties.name === 'Amazone');
if (idx >= 0) { gj.features[idx] = feature; console.log('Bestaande Amazone vervangen'); }
else { gj.features.push(feature); console.log('Amazone toegevoegd'); }
fs.writeFileSync(DEST, JSON.stringify(gj));
console.log(`✓ wateren.geojson bijgewerkt (${gj.features.length} features)`);
