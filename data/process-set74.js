#!/usr/bin/env node
// Verwerkt Overpass-data voor set 74 (Duitsland): Rijn, Elbe, Moezel.
// Voegt toe aan wateren.geojson. Vervangt de bestaande NL-only "Rijn"-feature
// door de volledige Rhein-relatie (Basel → Rotterdam) met sets [57, 74].

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

function processRiver(file, nlName, sets, eps = 0.003, maxGap = 0.1) {
  const fp = path.join(__dirname, 'overpass', file);
  if (!fs.existsSync(fp)) { console.log(`⚠️  ${file} ontbreekt — overgeslagen`); return null; }
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (!raw.elements?.length) { console.log(`⚠️  ${file} leeg`); return null; }

  const relation = raw.elements.find(e => e.type === 'relation');
  let ways;
  if (relation) {
    // Bij grote rivieren gebruikt OSM role=main_stream voor het hoofdtraject,
    // en role=side_stream voor kanaal-aftakkingen. main_stream filter voorkomt zigzag.
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
  const lons = simplified.map(c => c[0]);
  console.log(`  ${nlName}: ${ways.length} ways → ${simplified.length} punten (lat ${Math.min(...lats).toFixed(2)}–${Math.max(...lats).toFixed(2)}, lon ${Math.min(...lons).toFixed(2)}–${Math.max(...lons).toFixed(2)})`);
  return {
    type: 'Feature',
    properties: { name: nlName, sets },
    geometry: { type: 'LineString', coordinates: simplified },
  };
}

// ── Hoofdprogramma ─────────────────────────────────────────────────

console.log('\nRivieren voor set 74 (Duitsland):');

// Rijn: volledige relatie Basel → Rotterdam. Vervangt de bestaande NL-only Rijn.
// Sets [57, 74] zodat zowel het wateren-hoofdstuk als Duitsland dezelfde geometrie gebruikt.
const rhein = processRiver('rhein-duitsland.json', 'Rijn', [57, 74], 0.003, 0.1);

// Elbe: CZ-grens → Noordzee. Alleen set 74.
const elbe = processRiver('elbe.json', 'Elbe', [74], 0.003, 0.1);

// Moezel: FR-grens → Koblenz. Alleen set 74.
const moezel = processRiver('mosel.json', 'Moezel', [74], 0.003, 0.1);

const newFeatures = [rhein, elbe, moezel].filter(Boolean);

const waterPath = path.join(__dirname, '..', 'wateren.geojson');
const wateren = JSON.parse(fs.readFileSync(waterPath, 'utf8'));

for (const feat of newFeatures) {
  // Rijn: vervang op naam (niet op sets) — de bestaande NL-Rijn wordt overschreven
  //       door de volledige relatie zodat set 5.7 óók de Duitse loop toont.
  // Elbe/Moezel: nieuw — push als niet aanwezig, anders vervang.
  const idx = wateren.features.findIndex(f => f.properties.name === feat.properties.name);
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
