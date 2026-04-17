#!/usr/bin/env node
// Verwerkt Overpass-data voor set 76: Donau, Po + handmatige polygonen voor
// Meer van Genève, Balaton en Adriatische Zee.
// Hergebruikt chain + RDP uit de andere process-scripts.

const fs   = require('fs');
const path = require('path');

// ── RDP + chain ───────────────────────────────────────────────

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

    { // Verleng aan de staart
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

    { // Verleng aan de kop
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

// ── Rivieren verwerken ─────────────────────────────────────────

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

// ── Hoofdprogramma ─────────────────────────────────────────────

const SETS_76 = [76];

console.log('\nRivieren:');
const waterFeatures = [
  processRiver('donau.json', 'Donau', SETS_76, 0.005, 0.1),
  processRiver('po.json', 'Po', SETS_76, 0.003, 0.1),
].filter(Boolean);

// Handmatige polygonen
console.log('\nHandmatige wateren:');
const handmatigeWateren = [
  {
    name: 'Meer van Genève',
    sets: SETS_76,
    coords: [
      [6.15, 46.20], [6.25, 46.16], [6.40, 46.15], [6.58, 46.20],
      [6.70, 46.30], [6.85, 46.38], [6.90, 46.45], [6.85, 46.50],
      [6.65, 46.50], [6.50, 46.47], [6.35, 46.42], [6.20, 46.35],
      [6.15, 46.28], [6.15, 46.20],
    ],
  },
  {
    name: 'Balaton',
    sets: SETS_76,
    coords: [
      [17.25, 46.72], [17.40, 46.70], [17.55, 46.73], [17.70, 46.78],
      [17.80, 46.82], [17.90, 46.88], [17.95, 46.92], [17.90, 46.95],
      [17.75, 46.93], [17.60, 46.90], [17.45, 46.85], [17.30, 46.80],
      [17.25, 46.76], [17.25, 46.72],
    ],
  },
  {
    name: 'Adriatische Zee',
    sets: SETS_76,
    coords: [
      [12.30, 45.60], [13.60, 45.40], [15.00, 44.50], [16.00, 43.50],
      [17.20, 42.70], [18.50, 42.00], [19.50, 41.30], [19.80, 40.50],
      [19.50, 39.90], [18.50, 40.20], [17.00, 40.80], [16.00, 41.20],
      [15.00, 42.00], [14.00, 42.50], [13.50, 43.40], [13.20, 44.00],
      [12.50, 44.50], [12.30, 45.20], [12.30, 45.60],
    ],
  },
];

for (const w of handmatigeWateren) {
  console.log(`  ${w.name}: handmatig polygoon (${w.coords.length} punten)`);
  waterFeatures.push({
    type: 'Feature',
    properties: { name: w.name, sets: w.sets },
    geometry: { type: 'Polygon', coordinates: [w.coords] },
  });
}

// Toevoegen aan wateren.geojson
const waterPath = path.join(__dirname, '..', 'wateren.geojson');
const wateren = JSON.parse(fs.readFileSync(waterPath, 'utf8'));

for (const feat of waterFeatures) {
  const idx = wateren.features.findIndex(
    f => f.properties.name === feat.properties.name &&
         JSON.stringify(f.properties.sets) === JSON.stringify(SETS_76)
  );
  if (idx >= 0) {
    wateren.features[idx] = feat;
    console.log(`  → ${feat.properties.name} vervangen`);
  } else {
    wateren.features.push(feat);
    console.log(`  → ${feat.properties.name} toegevoegd`);
  }
}

fs.writeFileSync(waterPath, JSON.stringify(wateren));
console.log('  ✓ wateren.geojson bijgewerkt');

console.log('\nDone.');
