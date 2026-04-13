#!/usr/bin/env node
// Verwerkt Overpass-data voor set 73: gebieden + rivieren van FR/ES/PT
// Voegt toe aan gewesten.geojson (gebieden) en wateren.geojson (rivieren)

const fs   = require('fs');
const path = require('path');

// ── RDP + chain (identiek aan process-bugfixes.js) ─────────────────

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

  // Relatie-formaat: members met geometry
  const relation = raw.elements.find(e => e.type === 'relation');
  let ways;
  if (relation) {
    ways = relation.members.filter(m => m.type === 'way' && m.geometry &&
      (!m.role || m.role === 'main_stream' || m.role === ''));
    if (ways.length === 0) {
      // Sommige relaties gebruiken geen role — neem alle way-members
      ways = relation.members.filter(m => m.type === 'way' && m.geometry);
    }
  } else {
    ways = raw.elements.filter(e => e.type === 'way' && e.geometry);
  }

  const chained = chain(ways, maxGap);
  const simplified = rdp(chained, eps).map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);
  const lats = simplified.map(c => c[1]);
  console.log(`  ${nlName}: ${raw.elements.length} ways → ${simplified.length} punten (lat ${Math.min(...lats).toFixed(2)}–${Math.max(...lats).toFixed(2)})`);
  return {
    type: 'Feature',
    properties: { name: nlName, sets },
    geometry: { type: 'LineString', coordinates: simplified },
  };
}

// ── Polygoon uit relatie verwerken ─────────────────────────────────

function processRegion(file, nlName, sets, eps = 0.005) {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'overpass', file), 'utf8'));
  const relation = raw.elements.find(e => e.type === 'relation');
  if (!relation) { console.log(`⚠️  Geen relatie in ${file}`); return null; }

  const outerWays = relation.members.filter(m => m.type === 'way' && m.geometry && m.role !== 'inner');
  const outerRing = chain(outerWays);
  const simplified = rdp(outerRing, eps).map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);

  if (dist(simplified[0], simplified[simplified.length-1]) > 0.001) {
    simplified.push(simplified[0]);
  }

  console.log(`  ${nlName}: ${outerWays.length} ways → ${simplified.length} punten`);
  return {
    type: 'Feature',
    properties: { name: nlName, sets },
    geometry: { type: 'Polygon', coordinates: [simplified] },
  };
}

// ── Hoofdprogramma ─────────────────────────────────────────────────

const SETS_73 = [73];

// Rivieren → wateren.geojson
console.log('\nRivieren:');
const riverFeatures = [
  processRiver('seine.json', 'Seine', SETS_73, 0.003, 0.05),
  processRiver('loire.json', 'Loire', SETS_73, 0.005, 2.0),  // grote gap: rivier maakt brede bocht
  processRiver('rhone.json', 'Rhône', SETS_73, 0.003, 0.1),
].filter(Boolean);

const waterPath = path.join(__dirname, '..', 'wateren.geojson');
const wateren = JSON.parse(fs.readFileSync(waterPath, 'utf8'));

for (const feat of riverFeatures) {
  const idx = wateren.features.findIndex(
    f => f.properties.name === feat.properties.name &&
         JSON.stringify(f.properties.sets) === JSON.stringify(SETS_73)
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

// Gebieden → gewesten.geojson
console.log('\nGebieden:');
const regionFeatures = [
  processRegion('bretagne.json',  'Bretagne',         SETS_73),
  processRegion('normandie.json', 'Normandië',        SETS_73),
  processRegion('corsica.json',   'Corsica',          SETS_73),
  processRegion('mallorca.json',  'Mallorca',         SETS_73),
].filter(Boolean);

// Elzas, Centraal Massief, Pyreneeën — handmatige polygonen (geen eenduidige OSM-administratieve grens)
const handmatigGebieden = [
  {
    name: 'Elzas',
    sets: SETS_73,
    // Historische Elzas: Bas-Rhin + Haut-Rhin departmenten samen
    coords: [[7.5090,47.5060],[7.6200,47.5900],[7.7100,47.7200],[7.8300,48.0000],
              [7.9800,48.3100],[8.0500,48.5200],[7.9700,48.7800],[7.5200,49.0700],
              [7.2800,48.8000],[7.0900,48.6500],[6.8700,48.4700],[6.8300,48.2200],
              [7.0400,47.9500],[7.1800,47.7800],[7.3900,47.5800],[7.5090,47.5060]],
  },
  {
    name: 'Centraal Massief',
    sets: SETS_73,
    // Ruw omsluitend polygoon van het Centraal Massief
    coords: [[2.0500,45.2000],[2.8000,44.3000],[3.9500,44.1000],[4.8500,44.2500],
              [4.9000,44.7000],[4.5000,45.5000],[3.9000,46.1000],[3.2000,46.3000],
              [2.6000,46.2000],[2.0500,45.8000],[2.0500,45.2000]],
  },
  {
    name: 'Pyreneeën',
    sets: SETS_73,
    // Bergketen langs FR-ES grens van Atlantische kust tot Middellandse Zee
    coords: [[-1.7500,43.3500],[-0.8000,42.8000],[0.0000,42.6800],[0.7500,42.6000],
              [1.5000,42.5000],[2.3000,42.4000],[3.1500,42.5000],[3.3200,42.3500],
              [3.1500,42.2500],[2.2500,42.2500],[1.4000,42.3500],[0.6500,42.4500],
              [-0.1000,42.5000],[-0.8500,42.6500],[-1.8000,43.0500],[-1.7500,43.3500]],
  },
];

for (const g of handmatigGebieden) {
  console.log(`  ${g.name}: handmatig polygoon (${g.coords.length} punten)`);
  regionFeatures.push({
    type: 'Feature',
    properties: { name: g.name, sets: g.sets },
    geometry: { type: 'Polygon', coordinates: [g.coords] },
  });
}

const gewestenPath = path.join(__dirname, '..', 'gewesten.geojson');
const gewesten = JSON.parse(fs.readFileSync(gewestenPath, 'utf8'));

for (const feat of regionFeatures) {
  const idx = gewesten.features.findIndex(
    f => f.properties.name === feat.properties.name
  );
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

console.log('\nDone.');
