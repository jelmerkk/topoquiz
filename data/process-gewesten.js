#!/usr/bin/env node
// Converteert Overpass-data voor Belgische gewesten → gewesten.geojson
// Hergebruikt de chain/rdp-logica uit process-overpass.js

const fs = require('fs');
const path = require('path');

// ── RDP + chain (identiek aan process-overpass.js) ──────────────

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

// ── Process relation → GeoJSON Polygon feature ─────────────────

function processRelation(el, name) {
  const outerWays = el.members.filter(m => m.type === 'way' && m.geometry && m.role !== 'inner');
  const innerWays = el.members.filter(m => m.type === 'way' && m.geometry && m.role === 'inner');

  const outerRing = chain(outerWays);
  const simplified = rdp(outerRing, 0.005).map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);

  // Close ring if needed
  if (dist(simplified[0], simplified[simplified.length-1]) > 0.001) {
    simplified.push(simplified[0]);
  }

  const rings = [simplified];

  // Inner rings (holes), e.g. Brussels enclave in Vlaanderen
  for (const innerGroup of groupInnerWays(innerWays)) {
    const innerRing = chain(innerGroup);
    const innerSimp = rdp(innerRing, 0.003).map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);
    if (innerSimp.length >= 4) {
      if (dist(innerSimp[0], innerSimp[innerSimp.length-1]) > 0.001) innerSimp.push(innerSimp[0]);
      rings.push(innerSimp);
    }
  }

  console.log(`  ${name}: ${simplified.length} punten outer${rings.length > 1 ? `, ${rings.length-1} gat(en)` : ''}`);

  return {
    type: 'Feature',
    properties: { statnaam: name },
    geometry: { type: 'Polygon', coordinates: rings },
  };
}

// Inner ways may form multiple separate holes — group them by connectivity
function groupInnerWays(ways) {
  if (ways.length === 0) return [];
  // Simple: treat all inner ways as one group (works for Brussels enclave)
  return [ways];
}

// ── Main ───────────────────────────────────────────────────────

const NL_NAMES = { 53134: 'Vlaanderen', 90348: 'Wallonië', 54094: 'Brussels Hoofdstedelijk Gewest' };

const raw = JSON.parse(fs.readFileSync('/tmp/gewesten-raw.json', 'utf8'));

const features = [];
for (const el of raw.elements) {
  const name = NL_NAMES[el.id];
  if (!name) continue;
  console.log(`\nVerwerken: ${name} (${el.members.filter(m=>m.type==='way').length} ways)`);
  features.push(processRelation(el, name));
}

const geojson = { type: 'FeatureCollection', features };
const outPath = path.join(__dirname, '..', 'gewesten.geojson');
fs.writeFileSync(outPath, JSON.stringify(geojson, null, 0));
console.log(`\nGeschreven naar gewesten.geojson (${features.length} features)`);
