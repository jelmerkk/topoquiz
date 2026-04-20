#!/usr/bin/env node
// Issue #50: processeer afrika-wateren → features in wateren.geojson (sets:[82]).
//   Nijl         Q3392 → main_stream LineString (brontoe → delta, Z→N)
//   Congo        Q3503 → main_stream LineString (brontoe → monding)
//   Niger        Q3542 → main_stream LineString (brontoe → delta)
//   Suezkanaal   Q899  → LineString (chain alle ways, geen role-filter)
//   Victoriameer Q5505 → Polygon (outer-ring uit multipolygon-relation)

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

function processRiver(file, name, eps, orientFn) {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, file), 'utf8'));
  const rel = raw.elements.find(e => e.type === 'relation');
  const ways = rel.members.filter(m =>
    m.type === 'way' && m.geometry && m.role === 'main_stream');
  const chained = chain(ways, 0.1);
  const simp = roundCoords(rdp(chained, eps));
  if (orientFn && orientFn(simp) === false) simp.reverse();
  console.log(`  ${name.padEnd(14)} ways=${ways.length} chain=${chained.length} rdp(${eps})=${simp.length}`);
  return { type: 'LineString', coordinates: simp };
}

// Chain meerdere rivier-relaties tot één LineString (bijv. Witte Nijl + Nijl-proper).
// excludeWayIds: way-refs die overgeslagen worden (issue #84 — Sudd-zijtakken).
function processMultiRiver(files, name, eps, orientFn, excludeWayIds = []) {
  const excl = new Set(excludeWayIds);
  const allWays = [];
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, file), 'utf8'));
    const rel = raw.elements.find(e => e.type === 'relation');
    const ways = rel.members.filter(m =>
      m.type === 'way' && m.geometry && m.role === 'main_stream' && !excl.has(m.ref));
    allWays.push(...ways);
  }
  // maxGap 2.5° — na exclude van Sudd-zijtakken is de overgebleven gap in de
  // Witte Nijl ~2.2° (van 7.26°N → 9.48°N bij Malakal). 2.5° dekt dat + de
  // ~0.8° Khartoem-gap naar Nijl-proper. Breed genoeg voor de brugging, smal
  // genoeg om geen nieuwe zij-springen toe te staan.
  const chained = chain(allWays, 2.5);
  const simp = roundCoords(rdp(chained, eps));
  if (orientFn && orientFn(simp) === false) simp.reverse();
  console.log(`  ${name.padEnd(14)} ways=${allWays.length} chain=${chained.length} rdp(${eps})=${simp.length}`);
  return { type: 'LineString', coordinates: simp };
}

function processCanal(file, name, eps) {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, file), 'utf8'));
  const rel = raw.elements.find(e => e.type === 'relation');
  const ways = rel.members.filter(m => m.type === 'way' && m.geometry);
  const chained = chain(ways, 0.1);
  const simp = roundCoords(rdp(chained, eps));
  console.log(`  ${name.padEnd(14)} ways=${ways.length} chain=${chained.length} rdp(${eps})=${simp.length}`);
  return { type: 'LineString', coordinates: simp };
}

function closeRing(pts) {
  const a = pts[0], b = pts[pts.length-1];
  if (a[0] !== b[0] || a[1] !== b[1]) pts.push([a[0], a[1]]);
  return pts;
}

function processLake(file, name, eps) {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, file), 'utf8'));
  const rel = raw.elements.find(e => e.type === 'relation');
  // Grote meren in OSM hebben soms meerdere outer-ringen (eilanden worden
  // apart gerelateerd). We pakken de grootste outer-ring als enkel-Polygon.
  const outers = rel.members.filter(m =>
    m.type === 'way' && m.geometry && m.role === 'outer');
  // Chain alle outer-ways als één loop.
  const chained = chain(outers, 0.1);
  if (chained.length < 4) throw new Error(`${name}: te weinig ring-punten`);
  const simp = roundCoords(rdp(chained, eps));
  closeRing(simp);
  console.log(`  ${name.padEnd(14)} outer-ways=${outers.length} chain=${chained.length} rdp(${eps})=${simp.length}`);
  return { type: 'Polygon', coordinates: [simp] };
}

const features = [
  // Nijl = Witte Nijl (Lake Victoria uitstroom, Jinja ~0.4°N) + Nijl-proper
  // (Khartoem ~15.6°N → delta ~31°N). Samen ~31° span, past bij school-atlas.
  // Blauwe Nijl is educatief maar wordt niet gemerged — visueel één rivier,
  // geen y-splitsing.
  //
  // Issue #84: in het Sudd-moeras heeft OSM twee `main_stream`-ways die
  // de Bahr el Ghazal-confluence naar het ZW in-trekken (way 1008733163
  // avg 6.47°N, way 1010377914 avg 6.61°N). Greedy chain pakt die bij
  // voorkeur boven de hoofdstroom die verderop bij Malakal (~9.4°N)
  // weer oppikt, wat een zichtbare terugsprong van ~1° geeft. Expliciet
  // excluden dwingt de main channel (Bahr el Jebel → Witte Nijl proper).
  { name: 'Nijl',  geom: processMultiRiver(['witte-nijl.json', 'nijl.json'], 'Nijl', 0.02,
      s => s[s.length-1][1] > s[0][1],
      [1008733163, 1010377914]) },
  // Congo stroomt vanaf Oost-Afrika naar Atlantische monding (~6°S, 12°E).
  // Bron bij Lualaba, monding bij Banana — eindpunt westelijker (kleinere lon).
  { name: 'Congo', geom: processRiver('congo-rivier.json', 'Congo', 0.02,
      s => s[s.length-1][0] < s[0][0]) },
  // Niger maakt boemerang: bron in Guinee → ZO naar Nigeria → monding in delta.
  // Geen strikte oriëntatie-check; accepteer wat chain oplevert.
  { name: 'Niger', geom: processRiver('niger.json',        'Niger', 0.02) },
  // Suezkanaal: N → Z (Port Said → Suez). Port Said ~31.25°N, Suez ~29.97°N.
  // Gedeeld met set 84 (Midden-Oosten) — sets expliciet meegeven zodat
  // regeneratie de set niet verliest.
  { name: 'Suezkanaal',   sets: [82, 84],
    geom: processCanal('suezkanaal.json',   'Suezkanaal',  0.005) },
  { name: 'Victoriameer', geom: processLake ('victoriameer.json', 'Victoriameer', 0.02) },
];

const gj = JSON.parse(fs.readFileSync(DEST, 'utf8'));
for (const { name, sets, geom } of features) {
  const feature = {
    type: 'Feature',
    properties: { name, sets: sets || [82] },
    geometry: geom,
  };
  const idx = gj.features.findIndex(f => f.properties.name === name);
  if (idx >= 0) { gj.features[idx] = feature; }
  else { gj.features.push(feature); }
}
fs.writeFileSync(DEST, JSON.stringify(gj));
const size = fs.statSync(DEST).size;
console.log(`\n✓ wateren.geojson bijgewerkt (${gj.features.length} features, ${Math.round(size/1024)} KB)`);
