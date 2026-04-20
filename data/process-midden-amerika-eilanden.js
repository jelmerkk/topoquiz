#!/usr/bin/env node
// Issue #57 (set 8.9): processeer Antillen-eilanden → eilanden-midden-amerika.geojson.
//
// Aruba / Curaçao / Bonaire / Sint Maarten komen als admin-boundary relations
// uit OSM. Outer-way segments worden gechained tot gesloten ringen, daarna
// RDP-vereenvoudigd. Sint Maarten is alleen de NL-zijde van het eiland —
// admin boundary snijdt over het eiland (FR/NL grens), dus de ring kan
// ongesloten zijn; we pakken daar de grootste succesvolle ring.

const fs   = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'overpass');
const DEST    = path.join(__dirname, '..', 'eilanden-midden-amerika.geojson');

const ISLANDS = [
  { file: 'aruba.json',        name: 'Aruba',        eps: 0.0020, minArea: 0.0001, maxRings: 3 },
  { file: 'curacao.json',      name: 'Curaçao',      eps: 0.0020, minArea: 0.0001, maxRings: 3 },
  { file: 'bonaire.json',      name: 'Bonaire',      eps: 0.0020, minArea: 0.0001, maxRings: 4 },
  { file: 'sint-maarten.json', name: 'Sint Maarten', eps: 0.0015, minArea: 0.00005, maxRings: 5 },
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

function chainRings(ways) {
  const segs = ways.map(w => w.geometry.map(n => [n.lon, n.lat]));
  const rings = [];
  const openChains = [];
  const used = new Set();

  for (let i = 0; i < segs.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    let current = [...segs[i]];
    if (eq(current[0], current[current.length-1])) {
      rings.push(current);
      continue;
    }
    let progressed = true;
    while (progressed) {
      progressed = false;
      const head = current[0], tail = current[current.length-1];
      for (let j = 0; j < segs.length; j++) {
        if (used.has(j)) continue;
        const s = segs[j];
        if (eq(tail, s[0]))          { current.push(...s.slice(1));                    used.add(j); progressed = true; break; }
        if (eq(tail, s[s.length-1])) { current.push(...[...s].reverse().slice(1));     used.add(j); progressed = true; break; }
        if (eq(head, s[s.length-1])) { current.unshift(...s.slice(0, -1));             used.add(j); progressed = true; break; }
        if (eq(head, s[0]))          { current.unshift(...[...s].reverse().slice(0, -1)); used.add(j); progressed = true; break; }
      }
      if (eq(current[0], current[current.length-1])) break;
    }
    if (eq(current[0], current[current.length-1])) {
      rings.push(current);
    } else {
      openChains.push(current);
    }
  }
  return { rings, openChains };
}

function roundRing(ring, digits = 4) {
  const f = Math.pow(10, digits);
  return ring.map(([x, y]) => [Math.round(x*f)/f, Math.round(y*f)/f]);
}

function pickRelation(elements) {
  const rels = elements.filter(e => e.type === 'relation');
  // Prefer place=island (fysieke kustlijn) boven boundary=administrative
  // (bevat vaak territoriale wateren). Sint Maarten (Q25596) is een
  // place=island relation.
  const islands = rels.filter(r =>
    r.tags?.place === 'island' &&
    r.members.some(m => m.type === 'way' && m.role === 'outer' && m.geometry));
  if (islands.length > 0) {
    return islands.sort((a,b) =>
      b.members.filter(m => m.type === 'way' && m.role === 'outer' && m.geometry).length -
      a.members.filter(m => m.type === 'way' && m.role === 'outer' && m.geometry).length)[0];
  }
  const admins = rels.filter(r =>
    r.tags?.boundary === 'administrative' &&
    r.members.some(m => m.type === 'way' && m.role === 'outer' && m.geometry));
  if (admins.length > 0) {
    return admins.sort((a,b) =>
      b.members.filter(m => m.type === 'way' && m.role === 'outer' && m.geometry).length -
      a.members.filter(m => m.type === 'way' && m.role === 'outer' && m.geometry).length)[0];
  }
  return rels.find(r => r.members.some(m => m.type === 'way' && m.role === 'outer' && m.geometry)) || rels[0];
}

function processIsland({ file, name, eps, minArea, maxRings }) {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, file), 'utf8'));
  const rel = pickRelation(raw.elements);
  if (!rel) throw new Error(`${name}: geen relation`);
  const ways = rel.members.filter(m => m.type === 'way' && m.role === 'outer' && m.geometry);
  const { rings, openChains } = chainRings(ways);

  // Sint Maarten NL-zijde: admin-grens over het eiland → vaak open chain.
  // Forceer sluiten door head→tail te verbinden als de chain lang genoeg is.
  let allRings = rings.slice();
  if (name === 'Sint Maarten' && allRings.length === 0 && openChains.length > 0) {
    const longest = openChains.sort((a,b) => b.length - a.length)[0];
    longest.push(longest[0]);
    allRings.push(longest);
  }

  let simp = allRings
    .map(r => rdp(r, eps))
    .map(r => roundRing(r))
    .filter(r => r.length >= 4)
    .filter(r => shoelaceArea(r) >= minArea)
    .sort((a,b) => shoelaceArea(b) - shoelaceArea(a))
    .slice(0, maxRings);

  const pts = simp.reduce((n,r) => n + r.length, 0);
  console.log(`  ${name.padEnd(14)} rel=${rel.id} ways=${ways.length} rings=${rings.length} open=${openChains.length} kept=${simp.length} pts=${pts}`);

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
      properties: { name: spec.name, sets: [89] },
      geometry,
    });
  } catch (e) {
    console.error(`  ${spec.name}: FAIL ${e.message}`);
  }
}

const gj = { type: 'FeatureCollection', features };
fs.writeFileSync(DEST, JSON.stringify(gj));
const size = fs.statSync(DEST).size;
console.log(`\n✓ eilanden-midden-amerika.geojson: ${features.length} features, ${Math.round(size/1024)} KB`);
