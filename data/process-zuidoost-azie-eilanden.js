#!/usr/bin/env node
// Issue #55: processeer ZOA-eilanden → features in eilanden-zuidoost-azie.geojson.
//
// Per eiland een relation uit OSM (place=island, type=multipolygon).
// Multi-way outer-segments worden gechained tot gesloten ringen, daarna RDP-
// vereenvoudigd en gefilterd op minimum-oppervlak. Bij archipels (Molukken)
// wordt het aantal ringen begrensd.

const fs   = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'overpass');
const DEST    = path.join(__dirname, '..', 'eilanden-zuidoost-azie.geojson');

// Per eiland: bestand, naam, eps voor RDP, minArea (in graden²) voor
// ringfilter, maxRings (cap voor archipels). Kalimantan heeft geen
// place=island relation (het is admin), dus preferType kan 'admin' zijn.
const ISLANDS = [
  { file: 'kalimantan.json', name: 'Kalimantan', eps: 0.025, minArea: 0.005, maxRings: 10, preferType: 'admin' },
  { file: 'sumatra.json',    name: 'Sumatra',    eps: 0.020, minArea: 0.0005, maxRings: 30, preferType: 'island' },
  { file: 'sulawesi.json',   name: 'Sulawesi',   eps: 0.020, minArea: 0.0005, maxRings: 30, preferType: 'island' },
  { file: 'java.json',       name: 'Java',       eps: 0.020, minArea: 0.0005, maxRings: 20, preferType: 'island' },
  { file: 'molukken.json',   name: 'Molukken',   eps: 0.025, minArea: 0.003, maxRings: 40, preferType: 'island' },
];

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

function shoelaceArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i][0] * ring[i+1][1] - ring[i+1][0] * ring[i][1];
  }
  return Math.abs(a) / 2;
}

function eq(a, b) { return a[0] === b[0] && a[1] === b[1]; }

// Chain outer-way segments tot gesloten ringen. Segmenten eindigen vaak exact
// op elkaar (node-sharing), dus endpoint-equality is voldoende.
function chainRings(ways) {
  const segs = ways.map(w => w.geometry.map(n => [n.lon, n.lat]));
  const rings = [];
  const used = new Set();

  for (let i = 0; i < segs.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    let current = [...segs[i]];
    // Ring al gesloten? dan direct klaar.
    if (eq(current[0], current[current.length-1])) {
      rings.push(current);
      continue;
    }
    // Extend door matching endpoints te zoeken.
    let progressed = true;
    while (progressed) {
      progressed = false;
      const head = current[0], tail = current[current.length-1];
      for (let j = 0; j < segs.length; j++) {
        if (used.has(j)) continue;
        const s = segs[j];
        if (eq(tail, s[0]))      { current.push(...s.slice(1));              used.add(j); progressed = true; break; }
        if (eq(tail, s[s.length-1])) { current.push(...[...s].reverse().slice(1)); used.add(j); progressed = true; break; }
        if (eq(head, s[s.length-1])) { current.unshift(...s.slice(0, -1));   used.add(j); progressed = true; break; }
        if (eq(head, s[0]))      { current.unshift(...[...s].reverse().slice(0, -1)); used.add(j); progressed = true; break; }
      }
      if (eq(current[0], current[current.length-1])) break;
    }
    if (eq(current[0], current[current.length-1])) {
      rings.push(current);
    }
    // Open chains (onvolledig gesloten) worden overgeslagen — kustlijn-gaps.
  }
  return rings;
}

function roundRing(ring, digits = 4) {
  const f = Math.pow(10, digits);
  return ring.map(([x, y]) => [Math.round(x*f)/f, Math.round(y*f)/f]);
}

function pickRelation(elements, preferType) {
  const rels = elements.filter(e => e.type === 'relation');
  // Prefer place=island relations.
  const islands = rels.filter(r => r.tags?.place === 'island' && r.tags?.type === 'multipolygon');
  if (preferType === 'island' && islands.length > 0) {
    // Kies de grootste (meeste way-outer members).
    return islands.sort((a,b) =>
      b.members.filter(m => m.type === 'way' && m.role === 'outer').length -
      a.members.filter(m => m.type === 'way' && m.role === 'outer').length)[0];
  }
  // Anders: admin boundary met meeste outer-ways.
  const admins = rels.filter(r => r.tags?.type === 'boundary' &&
    r.members.some(m => m.type === 'way' && m.role === 'outer' && m.geometry));
  if (admins.length > 0) {
    return admins.sort((a,b) =>
      b.members.filter(m => m.type === 'way' && m.role === 'outer' && m.geometry).length -
      a.members.filter(m => m.type === 'way' && m.role === 'outer' && m.geometry).length)[0];
  }
  // Fallback: eerste relation met outer-ways met geometry.
  return rels.find(r => r.members.some(m => m.type === 'way' && m.role === 'outer' && m.geometry)) || rels[0];
}

function processIsland({ file, name, eps, minArea, maxRings, preferType }) {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, file), 'utf8'));
  const rel = pickRelation(raw.elements, preferType);
  if (!rel) throw new Error(`${name}: geen relation`);
  const ways = rel.members.filter(m => m.type === 'way' && m.role === 'outer' && m.geometry);
  const rings = chainRings(ways);

  let simp = rings
    .map(r => rdp(r, eps))
    .map(r => roundRing(r))
    .filter(r => r.length >= 4)
    .filter(r => shoelaceArea(r) >= minArea)
    .sort((a,b) => shoelaceArea(b) - shoelaceArea(a))
    .slice(0, maxRings);

  const pts = simp.reduce((n,r) => n + r.length, 0);
  console.log(`  ${name.padEnd(12)} rel=${rel.id} ways=${ways.length} rings=${rings.length} kept=${simp.length} pts=${pts}`);

  if (simp.length === 0) throw new Error(`${name}: 0 rings na filter`);
  if (simp.length === 1) return { type: 'Polygon', coordinates: [simp[0]] };
  return { type: 'MultiPolygon', coordinates: simp.map(r => [r]) };
}

const features = [];
for (const spec of ISLANDS) {
  try {
    const geometry = processIsland(spec);
    features.push({
      type: 'Feature',
      properties: { name: spec.name, sets: [87] },
      geometry,
    });
  } catch (e) {
    console.error(`  ${spec.name}: FAIL ${e.message}`);
  }
}

const gj = { type: 'FeatureCollection', features };
fs.writeFileSync(DEST, JSON.stringify(gj));
const size = fs.statSync(DEST).size;
console.log(`\n✓ eilanden-zuidoost-azie.geojson: ${features.length} features, ${Math.round(size/1024)} KB`);
