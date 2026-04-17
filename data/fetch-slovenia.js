#!/usr/bin/env node
// Eenmalig script: Slovenië ophalen uit Natural Earth 1:50m en toevoegen aan
// landen-europa.geojson. Hergebruikt dezelfde RDP-simplificatie als process-set75.js.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
const LANDEN_PATH = path.join(__dirname, '..', 'landen-europa.geojson');

// ── RDP (identiek aan process-set75.js) ────────────────────────
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

function simplifyRing(ring, eps) {
  const simp = rdp(ring, eps).map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);
  if (dist(simp[0], simp[simp.length-1]) > 0.001) simp.push(simp[0]);
  return simp;
}

// ── Main ────────────────────────────────────────────────────────
console.log('Downloading Natural Earth 1:50m countries...');
https.get(URL, res => {
  if (res.statusCode !== 200) { console.error('HTTP', res.statusCode); process.exit(1); }
  let buf = '';
  res.setEncoding('utf8');
  res.on('data', c => { buf += c; });
  res.on('end', () => {
    const data = JSON.parse(buf);
    const slovenia = data.features.find(f => f.properties.ADMIN === 'Slovenia');
    if (!slovenia) { console.error('Slovenië niet gevonden in NE data'); process.exit(1); }

    const g = slovenia.geometry;
    const rawRings = g.type === 'MultiPolygon'
      ? g.coordinates.map(poly => poly[0])
      : [g.coordinates[0]];

    const eps = 0.01;
    const simplifiedRings = rawRings
      .map(r => simplifyRing(r, eps))
      .filter(r => r.length >= 4);

    const totalPts = simplifiedRings.reduce((s, r) => s + r.length, 0);
    console.log(`  Slovenië: ${rawRings.length} ring(en) → ${totalPts} punten (eps=${eps})`);

    const feature = {
      type: 'Feature',
      properties: { name: 'Slovenië' },
      geometry: simplifiedRings.length === 1
        ? { type: 'Polygon', coordinates: [simplifiedRings[0]] }
        : { type: 'MultiPolygon', coordinates: simplifiedRings.map(r => [r]) },
    };

    // Toevoegen aan landen-europa.geojson
    const landen = JSON.parse(fs.readFileSync(LANDEN_PATH, 'utf8'));
    const idx = landen.features.findIndex(f => f.properties.name === 'Slovenië');
    if (idx >= 0) {
      landen.features[idx] = feature;
      console.log('  → Slovenië vervangen in landen-europa.geojson');
    } else {
      landen.features.push(feature);
      console.log('  → Slovenië toegevoegd aan landen-europa.geojson');
    }
    fs.writeFileSync(LANDEN_PATH, JSON.stringify(landen));
    console.log('  ✓ landen-europa.geojson bijgewerkt');
  });
}).on('error', e => { console.error(e); process.exit(1); });
