#!/usr/bin/env node
// Issue #38: vervang de upper-hull-gebaseerde N-kust van de 5 Waddeneilanden
// door werkelijke gechainde OSM-coastline ways. Dat geeft gladde overgangen
// bij de zeegaten (Eierlandse Gat, Pinkegat) i.p.v. rechtlijnige stappen.
//
// Per eiland:
//   1. Laad fetched OSM ways (data/overpass/wadden-<isl>.json)
//   2. Chain ways tot rings. Sommige eilanden hebben meerdere partial-rings
//      (Ameland valt in W+O-helft uiteen door harbor-break).
//   3. Keep rings met bbox-width ≥ 0.02° (≈1.3 km) om zandplaten en havens
//      weg te filteren.
//   4. Per kept-ring: bovenste boog van westmost→eastmost langs N-helft.
//   5. Concat W→E, RDP-simplify.
//
// Output: data/overpass/wadden-outer-coasts.json (vervangt oude hull-versie).

const fs   = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'overpass');

function dist2(a, b) { const dx=a[0]-b[0], dy=a[1]-b[1]; return dx*dx+dy*dy; }
const EPS2 = 1e-12;  // ≈ 1e-6 graden = ~10 cm; OSM endpoints matchen exact

function chainWays(ways) {
  const segs = ways.map(w => w.geometry.map(n => [n.lon, n.lat]));
  const used = new Uint8Array(segs.length);
  const rings = [];

  while (true) {
    let startIdx = -1;
    for (let i = 0; i < segs.length; i++) if (!used[i]) { startIdx = i; break; }
    if (startIdx === -1) break;
    used[startIdx] = 1;
    const ring = segs[startIdx].slice();

    let prog = true;
    while (prog) {
      prog = false;
      const tail = ring[ring.length-1];
      for (let i = 0; i < segs.length; i++) {
        if (used[i]) continue;
        const s = segs[i];
        if (dist2(tail, s[0]) < EPS2) {
          for (let k=1; k<s.length; k++) ring.push(s[k]);
          used[i] = 1; prog = true; break;
        }
        if (dist2(tail, s[s.length-1]) < EPS2) {
          for (let k=s.length-2; k>=0; k--) ring.push(s[k]);
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
        const s = segs[i];
        if (dist2(head, s[s.length-1]) < EPS2) {
          for (let k=s.length-2; k>=0; k--) ring.unshift(s[k]);
          used[i] = 1; grew = true; break;
        }
        if (dist2(head, s[0]) < EPS2) {
          for (let k=1; k<s.length; k++) ring.unshift(s[k]);
          used[i] = 1; grew = true; break;
        }
      }
    }

    rings.push(ring);
  }
  return rings;
}

function bbox(r) {
  let x0=Infinity, x1=-Infinity, y0=Infinity, y1=-Infinity;
  for (const [x,y] of r) {
    if (x<x0) x0=x; if (x>x1) x1=x;
    if (y<y0) y0=y; if (y>y1) y1=y;
  }
  return { x0, x1, y0, y1 };
}

// Bovenste boog: van westmost → eastmost langs de richting met hogere avg lat.
function upperArc(ring) {
  let wIdx = 0, eIdx = 0;
  for (let i = 1; i < ring.length; i++) {
    if (ring[i][0] < ring[wIdx][0]) wIdx = i;
    if (ring[i][0] > ring[eIdx][0]) eIdx = i;
  }
  const N = ring.length;
  const arc1 = [], arc2 = [];
  // forward
  for (let i = wIdx; ; i = (i + 1) % N) { arc1.push(ring[i]); if (i === eIdx) break; if (arc1.length > N) break; }
  // backward
  for (let i = wIdx; ; i = (i - 1 + N) % N) { arc2.push(ring[i]); if (i === eIdx) break; if (arc2.length > N) break; }
  const avgLat = a => a.reduce((s,p)=>s+p[1],0) / a.length;
  return avgLat(arc1) > avgLat(arc2) ? arc1 : arc2;
}

// ── RDP (iteratief) ─────────────────────────────────────────────────────

function perpDist(p, a, b) {
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

// ── Per eiland ─────────────────────────────────────────────────────────

// Minimale bbox-breedte (lon-spanne) om als "eiland-deel" te tellen en geen
// zandplaat / haven te zijn. 0.02° ≈ 1.3 km.
const MIN_RING_WIDTH = 0.02;

function processIsland({ name, file, minLat }, eps) {
  const raw = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  let ways = raw.elements.filter(e => e.type === 'way' && e.geometry && e.geometry.length >= 2);
  if (minLat != null) {
    ways = ways.filter(w => Math.max(...w.geometry.map(n => n.lat)) >= minLat);
  }

  const allRings = chainWays(ways);
  const kept = allRings
    .map(r => ({ r, b: bbox(r) }))
    .filter(({ b }) => (b.x1 - b.x0) >= MIN_RING_WIDTH)
    .sort((a, b) => a.b.x0 - b.b.x0);  // W→O binnen het eiland

  if (kept.length === 0) throw new Error(`${name}: geen rings na bbox-filter`);

  const arcs = kept.map(({ r }) => upperArc(r));
  const joined = [].concat(...arcs);
  const simp = rdp(joined, eps).map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);

  console.log(`${name.padEnd(16)} ${ways.length}w → ${allRings.length}r (${kept.length} kept) → arcs=${arcs.map(a=>a.length).join('+')} → simp=${simp.length}`);
  return simp;
}

// eps per eiland. 0.0012° ≈ 90 m: voldoende detail voor bochten, filtert
// intertidal ruis. Kleinere eilanden willen iets meer detail voor herkenbaarheid.
const EPS_PER_ISLAND = {
  texel:           0.0015,
  vlieland:        0.0010,
  terschelling:    0.0015,
  ameland:         0.0012,
  schiermonnikoog: 0.0015,
};

const ISLANDS = [
  { name: 'texel',           file: 'wadden-texel.json',           minLat: 53.0 },
  { name: 'vlieland',        file: 'wadden-vlieland.json',        minLat: null },
  { name: 'terschelling',    file: 'wadden-terschelling.json',    minLat: null },
  { name: 'ameland',         file: 'wadden-ameland.json',         minLat: null },
  { name: 'schiermonnikoog', file: 'wadden-schiermonnikoog.json', minLat: null },
];

const all = [];
for (const isl of ISLANDS) {
  const arc = processIsland(isl, EPS_PER_ISLAND[isl.name]);
  all.push(...arc);
}

const out = path.join(DIR, 'wadden-outer-coasts.json');
fs.writeFileSync(out, JSON.stringify(all, null, 2));
console.log(`\nTotal: ${all.length} pts — saved ${path.relative(path.join(__dirname,'..'), out)}`);
