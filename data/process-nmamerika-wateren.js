#!/usr/bin/env node
// Issue #51: processeer NMA-wateren → features in wateren.geojson (sets:[83]).
//   Mississippi   Q1497   → main_stream LineString (Itasca MN → delta LA, N→Z)
//   Rio Grande    Q160636 → main_stream LineString (Colorado → Golf, NW→SE)
//   Panamakanaal  Q7350   → LineString (chain alle ways)

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

function processCanal(file, name, eps, roleFilter) {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, file), 'utf8'));
  const rel = raw.elements.find(e => e.type === 'relation');
  let ways = rel.members.filter(m => m.type === 'way' && m.geometry);
  // Panamakanaal-relation is type=route met forward/backward-rollen
  // (twee vaarrichtingen). Beide chainen = loop. Filter één richting.
  if (roleFilter) ways = ways.filter(m => m.role === roleFilter);
  // Route-relations hebben geordende members (route-volgorde). Concat
  // direct in member-volgorde — chain() zou greedy-nearest doen en
  // daarbij zigzaggen door parallelle sluisbanen.
  const coords = [];
  for (const w of ways) {
    for (const n of w.geometry) {
      const pt = [n.lon, n.lat];
      if (coords.length === 0 || dist(coords[coords.length-1], pt) > 1e-7) {
        coords.push(pt);
      }
    }
  }
  const simp = roundCoords(rdp(coords, eps));
  console.log(`  ${name.padEnd(14)} ways=${ways.length} concat=${coords.length} rdp(${eps})=${simp.length}`);
  return { type: 'LineString', coordinates: simp };
}

const features = [
  // Mississippi: Itasca-meer (~47.2°N) → delta (~29°N). Orientatie N→Z, dus
  // start > end in lat. Grote maxGap (1.0) omdat main_stream-ways soms
  // onderbroken zijn bij meanders/deltaflanken.
  { name: 'Mississippi', geom: processRiver('mississippi.json', 'Mississippi', 0.03,
      s => s[0][1] > s[s.length-1][1], 1.0) },
  // Rio Grande: bron in Colorado (~37°N, −106°W) → Golf (~26°N, −97°W).
  // Oriënteer NW→SE: start noordelijker en westelijker.
  { name: 'Rio Grande',  geom: processRiver('rio-grande.json',  'Rio Grande',  0.03,
      s => s[0][1] > s[s.length-1][1], 0.5) },
  // Panamakanaal: ~80 km, Colón (Atlantisch, ~9.35°N, −79.92°W) → Panama-
  // Stad (Pacific, ~8.96°N, −79.52°W). OSM-relation bevat parallelle
  // sluisbanen + Gatun-meer doorvaart — greedy chain + member-order beide
  // zigzaggen. Voor een schoolkaart volstaat een schematische 2-punt lijn.
  { name: 'Panamakanaal', geom: { type: 'LineString', coordinates: [
      [-79.9175, 9.3467],  // Colón, Atlantische ingang
      [-79.5170, 8.9600],  // Panama-Stad, Pacific uitgang
  ]} },
];

const gj = JSON.parse(fs.readFileSync(DEST, 'utf8'));
for (const { name, geom } of features) {
  const feature = {
    type: 'Feature',
    properties: { name, sets: [83] },
    geometry: geom,
  };
  const idx = gj.features.findIndex(f => f.properties.name === name);
  if (idx >= 0) { gj.features[idx] = feature; }
  else { gj.features.push(feature); }
}
fs.writeFileSync(DEST, JSON.stringify(gj));
const size = fs.statSync(DEST).size;
console.log(`\n✓ wateren.geojson bijgewerkt (${gj.features.length} features, ${Math.round(size/1024)} KB)`);
