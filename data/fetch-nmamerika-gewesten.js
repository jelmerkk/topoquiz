#!/usr/bin/env node
// Issue #51 (set 8.3 NMA): gewesten/staten/territoria.
//   Alaska    — US state       (NE admin_1, name=Alaska)
//   Texas     — US state       (NE admin_1, name=Texas)
//   Florida   — US state       (NE admin_1, name=Florida)
//   Groenland — NL autonoom    (NE admin_0, WIKIDATAID=Q223)
//
// NE admin_1/admin_0 volgen de echte kustlijn — GEEN OSM admin_level,
// want die bevat territoriale wateren (12 nmi offshore) = lelijke
// rechte zee-grenzen. Zie set 75 UK-ervaring.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const ADM1_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson';
const ADM0_CACHE = path.join(__dirname, 'natural-earth', 'ne_10m_admin_0_countries.geojson');
const ADM1_CACHE = path.join(__dirname, 'natural-earth', 'ne_10m_admin_1_states_provinces.geojson');
const OUT = path.join(__dirname, 'overpass', 'nmamerika-gewesten.json');

// Abstractieniveau per gebied. Groenland is kolossaal (vooral ijskap,
// geen detail nodig) → hoge eps. Florida heeft fijne kust → lager.
const WANTED_ADM1 = {
  // US state name → { nl, eps }
  Alaska:  { nl: 'Alaska',  eps: 0.100 },
  Texas:   { nl: 'Texas',   eps: 0.035 },
  Florida: { nl: 'Florida', eps: 0.020 },
};
const WANTED_ADM0 = {
  Q223: { nl: 'Groenland', eps: 0.120 },
};

function perpendicularDist(p, a, b) {
  const dx = b[0]-a[0], dy = b[1]-a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0]-a[0], p[1]-a[1]);
  const t = ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / (dx*dx + dy*dy);
  return Math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy));
}

function rdp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = 1; keep[pts.length-1] = 1;
  const stack = [[0, pts.length-1]];
  while (stack.length) {
    const [lo, hi] = stack.pop();
    if (hi <= lo + 1) continue;
    let maxD = 0, maxI = -1;
    for (let i = lo+1; i < hi; i++) {
      const d = perpendicularDist(pts[i], pts[lo], pts[hi]);
      if (d > maxD) { maxD = d; maxI = i; }
    }
    if (maxD > eps && maxI !== -1) {
      keep[maxI] = 1;
      stack.push([lo, maxI]); stack.push([maxI, hi]);
    }
  }
  const out = [];
  for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]);
  return out;
}

function simplifyRing(ring, eps) {
  const simp = rdp(ring, eps).map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);
  const first = simp[0], last = simp[simp.length-1];
  if (first[0] !== last[0] || first[1] !== last[1]) simp.push(first);
  return simp;
}

function shoelaceArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i][0] * ring[i+1][1] - ring[i+1][0] * ring[i][1];
  }
  return Math.abs(a) / 2;
}

function countPts(geom) {
  if (geom.type === 'Polygon') return geom.coordinates.reduce((n,r)=>n+r.length,0);
  return geom.coordinates.reduce((n,p)=>n+p.reduce((nn,r)=>nn+r.length,0),0);
}

function processGeom(geom, nl, eps, { keepTopN = null, minAreaRatio = 0.001 } = {}) {
  let polys;
  if (geom.type === 'Polygon') polys = [geom.coordinates];
  else if (geom.type === 'MultiPolygon') polys = geom.coordinates;
  else throw new Error(`${nl}: unsupported geom type ${geom.type}`);

  let rings = polys.map(p => p[0]);
  rings = rings.map(r => simplifyRing(r, eps)).filter(r => r.length >= 4);
  if (rings.length === 0) throw new Error(`${nl}: 0 rings na simplify`);
  rings.sort((a, b) => shoelaceArea(b) - shoelaceArea(a));

  // Drop piepkleine ringen (< ratio × grootste) en (optioneel) beperk tot top-N
  const maxA = shoelaceArea(rings[0]);
  rings = rings.filter(r => shoelaceArea(r) >= maxA * minAreaRatio);
  if (keepTopN) rings = rings.slice(0, keepTopN);

  if (rings.length === 1) return { type: 'Polygon', coordinates: [rings[0]] };
  return { type: 'MultiPolygon', coordinates: rings.map(r => [r]) };
}

function downloadOrCache(url, cachePath) {
  return new Promise((res, rej) => {
    if (fs.existsSync(cachePath)) {
      return res(JSON.parse(fs.readFileSync(cachePath, 'utf8')));
    }
    console.log(`Downloading ${url}...`);
    const go = (u) => https.get(u, r => {
      if (r.statusCode === 301 || r.statusCode === 302) return go(r.headers.location);
      if (r.statusCode !== 200) return rej(new Error(`HTTP ${r.statusCode}`));
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => {
        const buf = Buffer.concat(chunks).toString('utf8');
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
        fs.writeFileSync(cachePath, buf);
        res(JSON.parse(buf));
      });
    }).on('error', rej);
    go(url);
  });
}

(async () => {
  const out = { type: 'FeatureCollection', features: [] };

  // --- Admin-1: Alaska, Texas, Florida ---
  const adm1 = await downloadOrCache(ADM1_URL, ADM1_CACHE);
  for (const feat of adm1.features) {
    const name = feat.properties.name;
    const iso = feat.properties.iso_a2;
    if (iso !== 'US' || !(name in WANTED_ADM1)) continue;
    const { nl, eps } = WANTED_ADM1[name];
    // Alaska heeft honderden eilandjes (Aleoeten) → keep top 8 ringen.
    const opts = name === 'Alaska' ? { keepTopN: 8 } : {};
    const geometry = processGeom(feat.geometry, nl, eps, opts);
    const rings = geometry.type === 'Polygon' ? 1 : geometry.coordinates.length;
    console.log(`  ${nl.padEnd(12)} ${geometry.type.padEnd(14)} ${rings} ring${rings>1?'en':''}, ${String(countPts(geometry)).padStart(4)} pts`);
    out.features.push({ type: 'Feature', properties: { name: nl, sets: [83] }, geometry });
  }

  // --- Admin-0: Groenland ---
  const adm0 = await downloadOrCache(
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson',
    ADM0_CACHE);
  for (const feat of adm0.features) {
    const qid = feat.properties.WIKIDATAID;
    if (!(qid in WANTED_ADM0)) continue;
    const { nl, eps } = WANTED_ADM0[qid];
    const geometry = processGeom(feat.geometry, nl, eps, { keepTopN: 4 });
    const rings = geometry.type === 'Polygon' ? 1 : geometry.coordinates.length;
    console.log(`  ${nl.padEnd(12)} ${geometry.type.padEnd(14)} ${rings} ring${rings>1?'en':''}, ${String(countPts(geometry)).padStart(4)} pts`);
    out.features.push({ type: 'Feature', properties: { name: nl, sets: [83] }, geometry });
  }

  fs.writeFileSync(OUT, JSON.stringify(out));
  const size = fs.statSync(OUT).size;
  console.log(`\n  ✓ ${OUT}: ${out.features.length} features, ${Math.round(size/1024)} KB`);
})();
