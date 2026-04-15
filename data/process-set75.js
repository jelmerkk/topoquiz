#!/usr/bin/env node
// Verwerkt Overpass-data voor set 75: UK-constituents + Ierland + Theems + Ierse Zee.
// - Regio-polygonen (Engeland, Schotland, Wales, Noord-Ierland, Ierland) → gewesten.geojson
// - Theems als LineString → wateren.geojson
// - Ierse Zee als handmatig polygoon → wateren.geojson
// - Het Kanaal krijgt set 75 toegevoegd (al aanwezig voor set 73)

const fs   = require('fs');
const path = require('path');

// ── RDP + chain (identiek aan process-set73.js) ────────────────────

function dist(a, b) { return Math.hypot(a[0]-b[0], a[1]-b[1]); }

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

function chain(ways, maxGap = 0.05) {
  const segs = ways.map(w => w.geometry.map(n => [n.lon, n.lat]));
  if (segs.length === 0) return [];
  if (segs.length === 1) return segs[0];

  const result = [...segs[0]];
  const used = new Set([0]);

  let progressed = true;
  while (progressed && used.size < segs.length) {
    progressed = false;

    { // Extend from tail
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
    }

    { // Extend from head
      const head = result[0];
      let bestIdx = -1, reversed = false, bestDist = Infinity;
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
  }

  return result;
}

// ── Rivieren verwerken ─────────────────────────────────────────────

function processRiver(file, nlName, sets, eps = 0.003, maxGap = 0.05) {
  const fp = path.join(__dirname, 'overpass', file);
  if (!fs.existsSync(fp)) { console.log(`⚠️  ${file} ontbreekt — overgeslagen`); return null; }
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (!raw.elements?.length) { console.log(`⚠️  ${file} leeg`); return null; }

  const relation = raw.elements.find(e => e.type === 'relation');
  let ways;
  if (relation) {
    ways = relation.members.filter(m => m.type === 'way' && m.geometry &&
      (!m.role || m.role === 'main_stream' || m.role === ''));
    if (ways.length === 0) {
      ways = relation.members.filter(m => m.type === 'way' && m.geometry);
    }
  } else {
    ways = raw.elements.filter(e => e.type === 'way' && e.geometry);
  }

  const chained = chain(ways, maxGap);
  const simplified = rdp(chained, eps).map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);
  const lats = simplified.map(c => c[1]);
  console.log(`  ${nlName}: ${ways.length} ways → ${simplified.length} punten (lat ${Math.min(...lats).toFixed(2)}–${Math.max(...lats).toFixed(2)})`);
  return {
    type: 'Feature',
    properties: { name: nlName, sets },
    geometry: { type: 'LineString', coordinates: simplified },
  };
}

// ── Natural Earth polygonen verwerken ─────────────────────────────
// UK-constituents (Engeland/Schotland/Wales/Noord-Ierland) + Ierland komen uit
// Natural Earth 1:50m admin_0_map_units. Land-only, inclusief kustlijn-islanden.
// Waarom niet OSM admin_level=4: daar zitten maritieme zones in waardoor
// Schotland één grote ring vormt die vasteland + Shetland omsluit.

function simplifyRing(ring, eps) {
  const simp = rdp(ring, eps).map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);
  if (dist(simp[0], simp[simp.length-1]) > 0.001) simp.push(simp[0]);
  return simp;
}

function processNERegion(neFeature, nlName, sets, eps = 0.005) {
  const g = neFeature.geometry;
  const rawRings = g.type === 'MultiPolygon'
    ? g.coordinates.map(poly => poly[0])
    : [g.coordinates[0]];

  const simplifiedRings = rawRings
    .map(r => simplifyRing(r, eps))
    .filter(r => r.length >= 4);

  const totalPts = simplifiedRings.reduce((s, r) => s + r.length, 0);
  console.log(`  ${nlName}: ${rawRings.length} ring(en) → ${totalPts} punten`);

  if (simplifiedRings.length === 1) {
    return {
      type: 'Feature',
      properties: { name: nlName, sets },
      geometry: { type: 'Polygon', coordinates: [simplifiedRings[0]] },
    };
  }
  return {
    type: 'Feature',
    properties: { name: nlName, sets },
    geometry: { type: 'MultiPolygon', coordinates: simplifiedRings.map(r => [r]) },
  };
}

// ── Hoofdprogramma ─────────────────────────────────────────────────

const SETS_75 = [75];

// Regio's → gewesten.geojson (uit Natural Earth)
console.log('\nRegio\'s (Natural Earth):');
const neRaw = JSON.parse(fs.readFileSync(path.join(__dirname, 'overpass', 'ne-uk-map-units.json'), 'utf8'));
const findNE = name => neRaw.features.find(f => f.properties.NAME === name);
const NE_MAPPING = [
  ['England',    'Engeland'],
  ['Scotland',   'Schotland'],
  ['Wales',      'Wales'],
  ['N. Ireland', 'Noord-Ierland'],
  ['Ireland',    'Ierland'],
];
const regionFeatures = NE_MAPPING.map(([neName, nlName]) => {
  const neF = findNE(neName);
  if (!neF) { console.log(`⚠️  ${neName} ontbreekt in NE-data`); return null; }
  return processNERegion(neF, nlName, SETS_75);
}).filter(Boolean);

const gewestenPath = path.join(__dirname, '..', 'gewesten.geojson');
const gewesten = JSON.parse(fs.readFileSync(gewestenPath, 'utf8'));

for (const feat of regionFeatures) {
  const idx = gewesten.features.findIndex(f => f.properties.name === feat.properties.name);
  if (idx >= 0) {
    gewesten.features[idx] = feat;
    console.log(`  → ${feat.properties.name} vervangen`);
  } else {
    gewesten.features.push(feat);
    console.log(`  → ${feat.properties.name} toegevoegd`);
  }
}
fs.writeFileSync(gewestenPath, JSON.stringify(gewesten));
console.log('  ✓ gewesten.geojson bijgewerkt');

// Rivieren + zeeën → wateren.geojson
console.log('\nWateren:');
const riverFeatures = [
  processRiver('thames.json', 'Theems', SETS_75, 0.003, 0.1),
].filter(Boolean);

// Handmatig polygoon: Ierse Zee, tussen Ierland (west) en Groot-Brittannië (oost).
// Outline loopt van Noord-Kanaal (N) via Isle of Man (centrum) naar St George's Channel (Z).
const handmatigeWateren = [
  {
    name: 'Ierse Zee',
    sets: SETS_75,
    coords: [
      [-5.70, 55.10], [-5.20, 54.80], [-4.50, 54.60], [-3.00, 54.40],
      [-2.80, 53.80], [-3.20, 53.30], [-4.50, 52.90], [-5.20, 52.60],
      [-5.80, 52.30], [-6.20, 52.10], [-6.50, 52.40], [-6.20, 53.20],
      [-6.00, 53.90], [-5.70, 54.60], [-5.70, 55.10],
    ],
  },
];

for (const w of handmatigeWateren) {
  console.log(`  ${w.name}: handmatig polygoon (${w.coords.length} punten)`);
  riverFeatures.push({
    type: 'Feature',
    properties: { name: w.name, sets: w.sets },
    geometry: { type: 'Polygon', coordinates: [w.coords] },
  });
}

const waterPath = path.join(__dirname, '..', 'wateren.geojson');
const wateren = JSON.parse(fs.readFileSync(waterPath, 'utf8'));

for (const feat of riverFeatures) {
  const idx = wateren.features.findIndex(
    f => f.properties.name === feat.properties.name &&
         JSON.stringify(f.properties.sets) === JSON.stringify(SETS_75)
  );
  if (idx >= 0) {
    wateren.features[idx] = feat;
    console.log(`  → ${feat.properties.name} vervangen`);
  } else {
    wateren.features.push(feat);
    console.log(`  → ${feat.properties.name} toegevoegd`);
  }
}

// Het Kanaal: bestaat al als set-73 feature. Voeg set 75 toe zodat hetzelfde
// polygoon gebruikt wordt door beide sets (geen duplicatie van geometrie).
const kanaalIdx = wateren.features.findIndex(f => f.properties.name === 'Het Kanaal');
if (kanaalIdx >= 0) {
  const sets = wateren.features[kanaalIdx].properties.sets || [];
  if (!sets.includes(75)) {
    wateren.features[kanaalIdx].properties.sets = [...sets, 75];
    console.log('  → Het Kanaal: set 75 toegevoegd aan bestaande feature');
  }
} else {
  console.warn('  ⚠️  Het Kanaal niet gevonden in wateren.geojson — kan set 75 niet koppelen');
}

fs.writeFileSync(waterPath, JSON.stringify(wateren));
console.log('  ✓ wateren.geojson bijgewerkt');

console.log('\nDone.');
