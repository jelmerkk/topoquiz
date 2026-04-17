#!/usr/bin/env node
// Extraheer Sicilië en Sardinië uit het Italië-MultiPolygon in Natural Earth.
// NE admin_0 countries heeft Italië als MultiPolygon met afzonderlijke ringen
// voor de eilanden. We identificeren ze op basis van hun centroïd-lat.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
const GEWESTEN_PATH = path.join(__dirname, '..', 'gewesten.geojson');

// ── RDP ────────────────────────────────────────────────────────
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

function ringCentroid(ring) {
  const lats = ring.map(c => c[1]);
  const lons = ring.map(c => c[0]);
  return {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lon: (Math.min(...lons) + Math.max(...lons)) / 2,
    minLat: Math.min(...lats), maxLat: Math.max(...lats),
    minLon: Math.min(...lons), maxLon: Math.max(...lons),
    pts: ring.length,
  };
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
    const italy = data.features.find(f => f.properties.ADMIN === 'Italy');
    if (!italy) { console.error('Italië niet gevonden'); process.exit(1); }

    const g = italy.geometry;
    if (g.type !== 'MultiPolygon') { console.error('Italië is geen MultiPolygon'); process.exit(1); }

    console.log(`Italië: ${g.coordinates.length} polygonen`);

    // Analyseer alle ringen
    const rings = g.coordinates.map((poly, i) => ({
      index: i,
      ring: poly[0],
      ...ringCentroid(poly[0]),
    }));

    // Sorteer op grootte (aantal punten)
    rings.sort((a, b) => b.pts - a.pts);
    for (const r of rings) {
      console.log(`  Ring ${r.index}: ${r.pts} pts, lat ${r.minLat.toFixed(1)}-${r.maxLat.toFixed(1)}, lon ${r.minLon.toFixed(1)}-${r.maxLon.toFixed(1)}`);
    }

    // Sicilië: grootste ring met centroïd lat < 39 en lon > 12
    const sicily = rings.find(r => r.lat < 39 && r.lon > 12 && r.pts > 20);
    // Sardinië: grootste ring met centroïd lon < 11 en lat < 42
    const sardinia = rings.find(r => r.lon < 11 && r.lat < 42 && r.lat > 38 && r.pts > 20);

    if (!sicily)   { console.error('Sicilië niet gevonden in Italië-ringen'); process.exit(1); }
    if (!sardinia) { console.error('Sardinië niet gevonden in Italië-ringen'); process.exit(1); }

    const eps = 0.01;
    const gewesten = JSON.parse(fs.readFileSync(GEWESTEN_PATH, 'utf8'));

    for (const [info, nlName] of [[sicily, 'Sicilië'], [sardinia, 'Sardinië']]) {
      const simplified = simplifyRing(info.ring, eps);
      console.log(`\n  ${nlName}: ${info.pts} → ${simplified.length} punten (eps=${eps})`);

      const feature = {
        type: 'Feature',
        properties: { name: nlName, sets: [76] },
        geometry: { type: 'Polygon', coordinates: [simplified] },
      };

      const idx = gewesten.features.findIndex(f => f.properties.name === nlName);
      if (idx >= 0) {
        gewesten.features[idx] = feature;
        console.log(`  → ${nlName} vervangen`);
      } else {
        gewesten.features.push(feature);
        console.log(`  → ${nlName} toegevoegd`);
      }
    }

    fs.writeFileSync(GEWESTEN_PATH, JSON.stringify(gewesten));
    console.log('\n  ✓ gewesten.geojson bijgewerkt');
  });
}).on('error', e => { console.error(e); process.exit(1); });
