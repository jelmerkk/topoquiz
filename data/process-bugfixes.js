#!/usr/bin/env node
// Verwerkt bugfix-data voor:
//   #75 — Luxemburg-polygoon in gewesten.geojson
//   #76 — Belgische Maas (zuidelijk traject) in wateren.geojson
//
// Vereist: data/overpass/luxembourg-boundary.json
// Optioneel: data/overpass/maas-zuiden.json  (Meuse/Maas Wallonië)

const fs   = require('fs');
const path = require('path');

// ── RDP + chain (identiek aan process-gewesten.js) ──────────────

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

function chain(ways) {
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
      if (bestIdx !== -1 && bestDist <= 0.05) {
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
      if (bestIdx !== -1 && bestDist <= 0.05) {
        const seg = reversed ? [...segs[bestIdx]].reverse() : segs[bestIdx];
        result.unshift(...seg.slice(0, -1));
        used.add(bestIdx);
        progressed = true;
      }
    }
  }

  return result;
}

// ── Fix #75: Luxemburg polygoon ─────────────────────────────────

function fixLuxemburg() {
  const luPath = path.join(__dirname, 'overpass', 'luxembourg-boundary.json');
  if (!fs.existsSync(luPath)) {
    console.log('⚠️  luxembourg-boundary.json niet gevonden, sla fix #75 over');
    return;
  }

  const raw = JSON.parse(fs.readFileSync(luPath, 'utf8'));
  const relation = raw.elements.find(e => e.type === 'relation');
  if (!relation) { console.log('⚠️  Geen relatie gevonden in luxembourg-boundary.json'); return; }

  const outerWays = relation.members.filter(m => m.type === 'way' && m.geometry && m.role !== 'inner');
  const outerRing = chain(outerWays);
  const simplified = rdp(outerRing, 0.005).map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);

  // Sluit ring
  if (dist(simplified[0], simplified[simplified.length-1]) > 0.001) {
    simplified.push(simplified[0]);
  }

  console.log(`\n#75 Luxemburg: ${outerWays.length} ways → ${simplified.length} punten na RDP`);

  // Lees gewesten.geojson, vervang of voeg toe
  const gewestenPath = path.join(__dirname, '..', 'gewesten.geojson');
  const geojson = JSON.parse(fs.readFileSync(gewestenPath, 'utf8'));

  const feature = {
    type: 'Feature',
    properties: { name: 'Luxemburg' },
    geometry: { type: 'Polygon', coordinates: [simplified] },
  };

  const idx = geojson.features.findIndex(f => f.properties.name === 'Luxemburg');
  if (idx >= 0) {
    geojson.features[idx] = feature;
    console.log('  Bestaand Luxemburg-feature vervangen');
  } else {
    geojson.features.push(feature);
    console.log('  Luxemburg-feature toegevoegd');
  }

  fs.writeFileSync(gewestenPath, JSON.stringify(geojson, null, 0));
  console.log('  ✓ gewesten.geojson bijgewerkt');
}

// ── Fix #76: Belgische Maas (zuidelijk traject) ─────────────────

function fixMaasZuiden() {
  const maasPath = path.join(__dirname, 'overpass', 'maas-zuiden.json');
  if (!fs.existsSync(maasPath)) {
    console.log('\n⚠️  maas-zuiden.json niet gevonden, sla fix #76 over');
    console.log('   Draai eerst: node data/fetch-bugfixes.js (na Overpass beschikbaar is)');
    return;
  }

  const raw = JSON.parse(fs.readFileSync(maasPath, 'utf8'));
  if (raw.elements.length === 0) { console.log('\n⚠️  maas-zuiden.json heeft geen elementen'); return; }

  // Chain de ways
  const chained = chain(raw.elements);
  const simplified = rdp(chained, 0.003).map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);

  const lats = simplified.map(c => c[1]);
  console.log(`\n#76 Maas zuiden: ${raw.elements.length} ways → ${simplified.length} punten | lat ${Math.min(...lats).toFixed(3)}-${Math.max(...lats).toFixed(3)}`);

  // Lees wateren.geojson, voeg het stuk toe aan de bestaande Belgische Maas
  const waterPath = path.join(__dirname, '..', 'wateren.geojson');
  const geojson = JSON.parse(fs.readFileSync(waterPath, 'utf8'));

  const maasIdx = geojson.features.findIndex(
    f => f.properties.name === 'Maas' && JSON.stringify(f.properties.sets) === JSON.stringify([72])
  );
  if (maasIdx < 0) { console.log('  ⚠️  Maas (sets:[72]) niet gevonden in wateren.geojson'); return; }

  const existingCoords = geojson.features[maasIdx].geometry.coordinates;
  const existingStart  = existingCoords[0]; // [lon, lat] southernmost existing point

  // Controleer of simplified aansluit op het begin van de bestaande lijn
  const newEnd     = simplified[simplified.length-1]; // meest noordelijk punt van het zuidelijk stuk
  const newStart   = simplified[0]; // meest zuidelijk punt
  const distToStart = dist(newEnd, existingStart);

  console.log(`  Bestaande Maas start: [${existingStart}]`);
  console.log(`  Nieuw stuk eind: [${newEnd}], afstand: ${distToStart.toFixed(4)}°`);

  let merged;
  if (distToStart < 0.05) {
    // Voeg zuidelijk stuk toe vóór bestaande coördinaten
    merged = [...simplified.slice(0, -1), ...existingCoords];
    console.log(`  Samengevoegd: ${simplified.length} + ${existingCoords.length} = ${merged.length} punten`);
  } else {
    console.log(`  ⚠️  Stukken sluiten niet aan (afstand ${distToStart.toFixed(4)}° > 0.05). Alleen registreren.`);
    return;
  }

  geojson.features[maasIdx].geometry.coordinates = merged;
  fs.writeFileSync(waterPath, JSON.stringify(geojson));
  console.log('  ✓ wateren.geojson bijgewerkt');
}

// ── Uitvoeren ───────────────────────────────────────────────────

fixLuxemburg();
fixMaasZuiden();
console.log('\nDone.');
