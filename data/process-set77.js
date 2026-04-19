#!/usr/bin/env node
// Verwerkt Overpass-data voor set 77: Oder, Weichsel, Dnjepr.
// Oostzee en Zwarte Zee via handmatig polygoon (vgl. Adriatische Zee in set 76).
// Hergebruikt chain + RDP uit process-set76.js.

const fs   = require('fs');
const path = require('path');

// ── RDP + chain (gekopieerd uit process-set76.js) ─────────────
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

function processRiver(file, nlName, sets, eps = 0.01, maxGap = 0.1, aliases) {
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
  const lons = simplified.map(c => c[0]);
  console.log(`  ${nlName}: ${ways.length} ways → ${simplified.length} punten (lat ${Math.min(...lats).toFixed(2)}–${Math.max(...lats).toFixed(2)}, lon ${Math.min(...lons).toFixed(2)}–${Math.max(...lons).toFixed(2)})`);
  const props = { name: nlName, sets };
  if (aliases) props.aliases = aliases;
  return {
    type: 'Feature',
    properties: props,
    geometry: { type: 'LineString', coordinates: simplified },
  };
}

// ── Hoofdprogramma ─────────────────────────────────────────────

const SETS_77 = [77];

console.log('\nRivieren (set 77):');
const waterFeatures = [
  processRiver('oder.json',     'Oder',     SETS_77, 0.01,  0.2),
  processRiver('weichsel.json', 'Weichsel', SETS_77, 0.01,  0.2),
  processRiver('dnjepr.json',   'Dnjepr',   SETS_77, 0.015, 0.3),
].filter(Boolean);

// Handmatige polygonen: Oostzee + Zwarte Zee.
// Oostzee bestaat al in wateren.geojson (leftover van pilot #60) en wordt
// overschreven. Zwarte Zee is volledig nieuw.
console.log('\nHandmatige zeeën:');
const handmatigeWateren = [
  {
    name: 'Oostzee',
    sets: SETS_77,
    aliases: ['Baltische Zee', 'Baltic Sea'],
    // Contour rond Oostzee: west (Denemarken) → noord (Bottnische Golf) →
    // oost (Finse Golf/Rigabocht) → zuid (Polen/Duitsland).
    coords: [
      [10.50, 54.50], [12.00, 54.20], [14.50, 54.20], [17.00, 54.50],
      [19.50, 54.60], [21.50, 55.20], [21.00, 57.00], [20.00, 58.80],
      [21.50, 59.50], [23.00, 59.80], [24.50, 60.20], [26.50, 60.30],
      [28.50, 60.50], [29.50, 60.20], [29.00, 62.00], [25.00, 63.50],
      [22.00, 64.80], [20.50, 64.00], [18.50, 62.00], [18.00, 60.00],
      [17.50, 58.50], [16.50, 57.00], [15.00, 56.00], [13.00, 55.50],
      [11.50, 55.00], [10.50, 54.50],
    ],
  },
  {
    name: 'Zwarte Zee',
    sets: SETS_77,
    aliases: ['Black Sea', 'Karadeniz'],
    // Contour rond Zwarte Zee: NW (Odessa-kust) → N (Krim) → NE (Azov-aansluiting) →
    // E (Kaukasus-kust) → SE (Georgië/Turkije) → S (Anatolische kust) → SW (Bosporus) →
    // W (Bulgaarse/Roemeense kust) → terug naar NW.
    coords: [
      [29.50, 45.30], [30.50, 46.30], [31.50, 46.60], [33.00, 46.20],
      [35.50, 45.30], [36.50, 45.40], [37.50, 45.00], [38.50, 44.30],
      [39.50, 43.50], [40.50, 43.00], [41.50, 41.80], [41.00, 41.30],
      [39.00, 41.10], [36.50, 41.20], [34.50, 42.00], [32.50, 42.00],
      [30.00, 41.50], [29.00, 41.20], [28.00, 41.80], [27.80, 42.30],
      [28.00, 43.00], [28.50, 43.80], [29.00, 44.50], [29.50, 45.30],
    ],
  },
];

for (const w of handmatigeWateren) {
  console.log(`  ${w.name}: handmatig polygoon (${w.coords.length} punten)`);
  const props = { name: w.name, sets: w.sets };
  if (w.aliases) props.aliases = w.aliases;
  waterFeatures.push({
    type: 'Feature',
    properties: props,
    geometry: { type: 'Polygon', coordinates: [w.coords] },
  });
}

// Samenvoegen in wateren.geojson
const waterPath = path.join(__dirname, '..', 'wateren.geojson');
const wateren = JSON.parse(fs.readFileSync(waterPath, 'utf8'));

for (const feat of waterFeatures) {
  // Zoek bestaand feature met deze naam (voor Oostzee overschrijven we het
  // pilot-feature; voor de rivieren overschrijven we als er toevallig al iets stond).
  const idx = wateren.features.findIndex(f => f.properties.name === feat.properties.name &&
    (!f.properties.sets || f.properties.sets.length === 0 ||
     JSON.stringify(f.properties.sets) === JSON.stringify(SETS_77)));
  if (idx >= 0) {
    wateren.features[idx] = feat;
    console.log(`  → ${feat.properties.name} vervangen`);
  } else {
    wateren.features.push(feat);
    console.log(`  → ${feat.properties.name} toegevoegd`);
  }
}

// Update sets voor Donau: [76] → [76, 77]
const donau = wateren.features.find(f => f.properties.name === 'Donau' && (f.properties.sets || []).includes(76));
if (donau) {
  if (!donau.properties.sets.includes(77)) donau.properties.sets.push(77);
  console.log(`  → Donau sets → [${donau.properties.sets.join(',')}]`);
}

fs.writeFileSync(waterPath, JSON.stringify(wateren));
console.log('\n  ✓ wateren.geojson bijgewerkt');
console.log('\nDone.');
