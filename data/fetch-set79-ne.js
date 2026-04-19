#!/usr/bin/env node
// Extraheer 9 Zuidoost-Europese landen uit Natural Earth 1:50m admin_0_countries
// en schrijf naar landen-europa.geojson.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
const LANDEN_PATH = path.join(__dirname, '..', 'landen-europa.geojson');

const MAP = {
  'Croatia':              'Kroatië',
  'Bosnia and Herz.':     'Bosnië-Hercegovina',
  'Serbia':               'Servië',
  'Republic of Serbia':   'Servië',
  'Montenegro':           'Montenegro',
  'Albania':              'Albanië',
  'Macedonia':            'Noord-Macedonië',
  'North Macedonia':      'Noord-Macedonië',
  'Greece':               'Griekenland',
  'Turkey':               'Turkije',
  'Cyprus':               'Cyprus',
};

// RDP-epsilon per land in graden.
const EPS = {
  'Kroatië':            0.04,
  'Bosnië-Hercegovina': 0.04,
  'Servië':             0.05,
  'Montenegro':         0.03,
  'Albanië':            0.03,
  'Noord-Macedonië':    0.04,
  'Griekenland':        0.05,
  'Turkije':            0.10,
  'Cyprus':             0.02,
};

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
  const first = simp[0], last = simp[simp.length-1];
  if (first[0] !== last[0] || first[1] !== last[1]) simp.push(first);
  return simp;
}

function simplifyGeometry(geom, eps) {
  if (geom.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geom.coordinates.map(ring => simplifyRing(ring, eps))
        .filter(ring => ring.length >= 4),
    };
  }
  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates.map(poly =>
      poly.map(ring => simplifyRing(ring, eps)).filter(ring => ring.length >= 4)
    ).filter(poly => poly.length > 0);
    if (polys.length === 1) return { type: 'Polygon', coordinates: polys[0] };
    return { type: 'MultiPolygon', coordinates: polys };
  }
  throw new Error('Unsupported geometry: ' + geom.type);
}

function countPts(geom) {
  if (geom.type === 'Polygon') return geom.coordinates.reduce((n,r)=>n+r.length,0);
  return geom.coordinates.reduce((n,p)=>n+p.reduce((nn,r)=>nn+r.length,0),0);
}

console.log('Downloading Natural Earth 1:50m admin_0 countries...');

https.get(URL, res => {
  if (res.statusCode !== 200) { console.error('HTTP', res.statusCode); process.exit(1); }
  let buf = '';
  res.setEncoding('utf8');
  res.on('data', c => { buf += c; });
  res.on('end', () => {
    const ne = JSON.parse(buf);
    const landen = JSON.parse(fs.readFileSync(LANDEN_PATH, 'utf8'));

    // NE admin_0 heeft diverse admin-varianten; match op ADMIN of NAME/NAME_LONG.
    const nlFound = new Set();
    for (const f of ne.features) {
      const p = f.properties;
      const candidates = [p.ADMIN, p.NAME, p.NAME_LONG, p.SOVEREIGNT].filter(Boolean);
      for (const c of candidates) {
        if (MAP[c] && !nlFound.has(MAP[c])) {
          nlFound.add(MAP[c]);
          const nlName = MAP[c];
          const eps = EPS[nlName];
          const geometry = simplifyGeometry(f.geometry, eps);
          const pts = countPts(geometry);
          console.log(`  ${nlName.padEnd(22)} ${f.geometry.type.padEnd(14)} → ${pts} pts (eps=${eps})`);

          const feature = {
            type: 'Feature',
            properties: { name: nlName, sets: [79] },
            geometry,
          };

          const idx = landen.features.findIndex(x => x.properties.name === nlName);
          if (idx >= 0) landen.features[idx] = feature;
          else landen.features.push(feature);
          break;
        }
      }
    }

    const expected = new Set(Object.values(MAP));
    for (const nl of expected) {
      if (!nlFound.has(nl)) console.error(`  MISSING: ${nl}`);
    }

    fs.writeFileSync(LANDEN_PATH, JSON.stringify(landen));
    console.log(`\n  ✓ landen-europa.geojson bijgewerkt (${landen.features.length} features)`);
  });
}).on('error', e => { console.error(e); process.exit(1); });
