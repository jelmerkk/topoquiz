#!/usr/bin/env node
// Issue #81: chain Bayern outer ways, RDP-simplify, en voeg toe aan gewesten.geojson.

const fs   = require('fs');
const path = require('path');

const SRC  = path.join(__dirname, 'overpass', 'beieren-boundary.json');
const DEST = path.join(__dirname, '..', 'gewesten.geojson');

function dist(a, b) { return Math.hypot(a[0]-b[0], a[1]-b[1]); }

// Bidirectionele greedy chain met exacte endpoint-match.
function chain(ways) {
  const segs = ways.map(w => w.geometry.map(n => [n.lon, n.lat]));
  const used = new Uint8Array(segs.length);
  const rings = [];
  const EPS = 1e-9;
  while (true) {
    let s = -1;
    for (let i = 0; i < segs.length; i++) if (!used[i]) { s = i; break; }
    if (s === -1) break;
    used[s] = 1;
    const ring = segs[s].slice();
    let prog = true;
    while (prog) {
      prog = false;
      const tail = ring[ring.length-1];
      for (let i = 0; i < segs.length; i++) {
        if (used[i]) continue;
        const seg = segs[i];
        if (dist(tail, seg[0]) < EPS) {
          for (let k=1; k<seg.length; k++) ring.push(seg[k]);
          used[i] = 1; prog = true; break;
        }
        if (dist(tail, seg[seg.length-1]) < EPS) {
          for (let k=seg.length-2; k>=0; k--) ring.push(seg[k]);
          used[i] = 1; prog = true; break;
        }
      }
    }
    let grew = true;
    while (grew) {
      grew = false;
      const head = ring[0];
      for (let i = 0; i < segs.length; i++) {
        if (used[i]) continue;
        const seg = segs[i];
        if (dist(head, seg[seg.length-1]) < EPS) {
          for (let k=seg.length-2; k>=0; k--) ring.unshift(seg[k]);
          used[i] = 1; grew = true; break;
        }
        if (dist(head, seg[0]) < EPS) {
          for (let k=1; k<seg.length; k++) ring.unshift(seg[k]);
          used[i] = 1; grew = true; break;
        }
      }
    }
    rings.push(ring);
  }
  return rings;
}

function perpDist(p, a, b) {
  const dx = b[0]-a[0], dy = b[1]-a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0]-a[0], p[1]-a[1]);
  const t = ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / (dx*dx + dy*dy);
  return Math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy));
}

// Iteratieve RDP — voorkomt stack overflow bij duizenden punten.
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
      const d = perpDist(pts[i], pts[lo], pts[hi]);
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

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const rel = raw.elements.find(e => e.type === 'relation');
if (!rel) { console.error('Geen relatie gevonden'); process.exit(1); }

const outerWays = rel.members.filter(m => m.type === 'way' && m.role !== 'inner' && m.geometry);
console.log(`Outer ways: ${outerWays.length}`);

const rings = chain(outerWays);
rings.sort((a, b) => b.length - a.length);
console.log(`Rings: ${rings.length} — groottes: ${rings.slice(0, 5).map(r => r.length).join(', ')}…`);

// De grootste gesloten ring is de bestuurlijke buitenrand van Bayern.
const outer = rings[0];
const simplified = rdp(outer, 0.005).map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);
if (dist(simplified[0], simplified[simplified.length-1]) > 0.001) simplified.push(simplified[0]);

console.log(`Outer ring: ${outer.length} → RDP(0.005) → ${simplified.length} pts`);

const gj = JSON.parse(fs.readFileSync(DEST, 'utf8'));
const feature = {
  type: 'Feature',
  properties: { name: 'Beieren', sets: [74] },
  geometry: { type: 'Polygon', coordinates: [simplified] },
};
const idx = gj.features.findIndex(f => f.properties.name === 'Beieren');
if (idx >= 0) { gj.features[idx] = feature; console.log('Bestaande Beieren-feature vervangen'); }
else { gj.features.push(feature); console.log('Beieren-feature toegevoegd'); }
fs.writeFileSync(DEST, JSON.stringify(gj));
console.log(`✓ ${path.relative(path.join(__dirname, '..'), DEST)} bijgewerkt`);
