#!/usr/bin/env node
// Extraheer 10 Oost-Europese landen uit Natural Earth 1:50m admin_0_countries
// en schrijf naar landen-europa.geojson. Werkt:
//   - Slowakije, Oekraïne, Moldavië, Roemenië, Bulgarije, Wit-Rusland, Rusland,
//     Estland, Letland, Litouwen → voeg toe of vervang bestaand feature
//   - Polen, Tsjechië, Hongarije → append 77 aan bestaande sets-array
//
// Rusland: bewust de volledige polygoon (inclusief Aziatisch deel tot 180°E).
// bounds[[40,14],[67,50]] van set 77 clipt visueel het oostelijke deel af.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
const LANDEN_PATH = path.join(__dirname, '..', 'landen-europa.geojson');

// NE admin_0 ADMIN-property → onze Nederlandse naam
const MAP = {
  'Slovakia': 'Slowakije',
  'Ukraine':  'Oekraïne',
  'Moldova':  'Moldavië',
  'Romania':  'Roemenië',
  'Bulgaria': 'Bulgarije',
  'Belarus':  'Wit-Rusland',
  'Russia':   'Rusland',
  'Estonia':  'Estland',
  'Latvia':   'Letland',
  'Lithuania': 'Litouwen',
};

// RDP-epsilon per land in graden. Grotere landen = grovere eps voor redelijke puntentelling.
// Match bestaande kwaliteit (30-60 pts per land).
const EPS = {
  'Slowakije':   0.05,
  'Oekraïne':    0.08,
  'Moldavië':    0.03,
  'Roemenië':    0.06,
  'Bulgarije':   0.05,
  'Wit-Rusland': 0.06,
  'Rusland':     0.15,  // Grover — volledige polygoon heeft te veel punten anders
  'Estland':     0.03,
  'Letland':     0.03,
  'Litouwen':    0.03,
};

// ── RDP ────────────────────────────────────────────────────────
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
  // Sluit ring als hij niet meer gesloten is na simplificatie
  const first = simp[0], last = simp[simp.length-1];
  if (first[0] !== last[0] || first[1] !== last[1]) simp.push(first);
  return simp;
}

// Filter polygonen die de dateline oversteken (lon < -170). NE plaatst Chukotka
// en enkele dateline-eilandjes aan de -180 kant, wat layer.getBounds() wereldwijd
// maakt (fitBounds zoomt dan uit tot de hele wereld). Voor de topo-quiz is het
// oostelijke Rusland tot +180°E genoeg — de paar pixels aan de andere kant van
// de dateline missen we niet.
function dropDatelinePolys(polys) {
  return polys.filter(poly => {
    const ring = poly[0];
    const minLon = Math.min(...ring.map(c => c[0]));
    return minLon > -170;
  });
}

function simplifyGeometry(geom, eps, name) {
  if (geom.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geom.coordinates.map(ring => simplifyRing(ring, eps))
        .filter(ring => ring.length >= 4),  // Drop mini-ringen
    };
  }
  if (geom.type === 'MultiPolygon') {
    let polys = geom.coordinates.map(poly =>
      poly.map(ring => simplifyRing(ring, eps)).filter(ring => ring.length >= 4)
    ).filter(poly => poly.length > 0);
    const before = polys.length;
    polys = dropDatelinePolys(polys);
    if (polys.length < before) {
      console.log(`    ${name}: ${before - polys.length} dateline-polygon(en) weggefilterd`);
    }
    if (polys.length === 1) return { type: 'Polygon', coordinates: polys[0] };
    return { type: 'MultiPolygon', coordinates: polys };
  }
  throw new Error('Unsupported geometry: ' + geom.type);
}

function countPts(geom) {
  if (geom.type === 'Polygon') return geom.coordinates.reduce((n,r)=>n+r.length,0);
  return geom.coordinates.reduce((n,p)=>n+p.reduce((nn,r)=>nn+r.length,0),0);
}

// ── Main ────────────────────────────────────────────────────────
console.log('Downloading Natural Earth 1:50m admin_0 countries...');

https.get(URL, res => {
  if (res.statusCode !== 200) { console.error('HTTP', res.statusCode); process.exit(1); }
  let buf = '';
  res.setEncoding('utf8');
  res.on('data', c => { buf += c; });
  res.on('end', () => {
    const ne = JSON.parse(buf);
    const landen = JSON.parse(fs.readFileSync(LANDEN_PATH, 'utf8'));

    // 1. Extract en vervang/voeg toe de 10 Oost-Europese landen
    for (const [neAdmin, nlName] of Object.entries(MAP)) {
      const src = ne.features.find(f => f.properties.ADMIN === neAdmin);
      if (!src) { console.error(`${neAdmin} niet gevonden in NE`); process.exit(1); }

      const eps = EPS[nlName];
      const geometry = simplifyGeometry(src.geometry, eps, nlName);
      const pts = countPts(geometry);
      console.log(`  ${nlName.padEnd(15)} ${src.geometry.type.padEnd(14)} → ${pts} pts (eps=${eps})`);

      const feature = {
        type: 'Feature',
        properties: { name: nlName, sets: [77] },
        geometry,
      };

      const idx = landen.features.findIndex(f => f.properties.name === nlName);
      if (idx >= 0) {
        landen.features[idx] = feature;
      } else {
        landen.features.push(feature);
      }
    }

    // 2. Update sets-arrays voor Polen, Tsjechië, Hongarije (appenden met 77)
    for (const nlName of ['Polen', 'Tsjechië', 'Hongarije']) {
      const feat = landen.features.find(f => f.properties.name === nlName);
      if (!feat) { console.error(`${nlName} niet gevonden in landen-europa.geojson`); process.exit(1); }
      const sets = feat.properties.sets || [];
      if (!sets.includes(77)) sets.push(77);
      feat.properties.sets = sets;
      console.log(`  ${nlName.padEnd(15)} sets → [${sets.join(',')}]`);
    }

    fs.writeFileSync(LANDEN_PATH, JSON.stringify(landen));
    console.log(`\n  ✓ landen-europa.geojson bijgewerkt (${landen.features.length} features)`);
  });
}).on('error', e => { console.error(e); process.exit(1); });
