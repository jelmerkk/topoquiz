#!/usr/bin/env node
// Issue #54 (set 8.6 Oost-Azië): Natural Earth 1:10m
// admin_0_countries → landen-oost-azie.geojson.
//
// Rusland: volledige polygon (incl. Kaliningrad) met hogere eps — leerling
// moet Rusland op wereldschaal herkennen. Andere landen binnen bbox.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson';
const LANDEN_PATH = path.join(__dirname, '..', 'landen-oost-azie.geojson');
const CACHE = path.join(__dirname, 'natural-earth', 'ne_10m_admin_0_countries.geojson');

// Bbox: Taiwan zuid (~22°N) tot Siberische Noordelijke IJszee (~80°N),
// Ural-Oeral (~60°E) tot Kamtsjatka oost (~180°E). Voor Rusland-ringen:
// geen bbox-filter (volledige polygon, ook Kaliningrad op ~20°E).
const OAZ_BBOX = { minLon: 60, maxLon: 180, minLat: 15, maxLat: 82 };

// eps in graden voor RDP — Rusland 0.05 (enorm, veel pts), eiland-archipels laag.
const COUNTRIES = {
  Q159: { nl: 'Rusland',     eps: 0.050, fullWorld: true },
  Q711: { nl: 'Mongolië',    eps: 0.035 },
  Q148: { nl: 'China',       eps: 0.040 },
  Q17:  { nl: 'Japan',       eps: 0.020 },
  Q423: { nl: 'Noord-Korea', eps: 0.018 },
  Q884: { nl: 'Zuid-Korea',  eps: 0.018 },
  Q865: { nl: 'Taiwan',      eps: 0.015 },
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

function ringBBox(ring) {
  let x0=Infinity, x1=-Infinity, y0=Infinity, y1=-Infinity;
  for (const [x,y] of ring) {
    if (x<x0) x0=x; if (x>x1) x1=x;
    if (y<y0) y0=y; if (y>y1) y1=y;
  }
  return { minLon:x0, maxLon:x1, minLat:y0, maxLat:y1 };
}

function overlapsBBox(ring, bb) {
  const r = ringBBox(ring);
  return !(r.maxLon < bb.minLon || r.minLon > bb.maxLon ||
           r.maxLat < bb.minLat || r.minLat > bb.maxLat);
}

function countPts(geom) {
  if (geom.type === 'Polygon') return geom.coordinates.reduce((n,r)=>n+r.length,0);
  return geom.coordinates.reduce((n,p)=>n+p.reduce((nn,r)=>nn+r.length,0),0);
}

function shoelaceArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i][0] * ring[i+1][1] - ring[i+1][0] * ring[i][1];
  }
  return Math.abs(a) / 2;
}

function downloadNE() {
  return new Promise((res, rej) => {
    if (fs.existsSync(CACHE)) {
      return res(JSON.parse(fs.readFileSync(CACHE, 'utf8')));
    }
    console.log(`Downloading ${URL}...`);
    const go = (url) => https.get(url, r => {
      if (r.statusCode === 301 || r.statusCode === 302) return go(r.headers.location);
      if (r.statusCode !== 200) return rej(new Error(`HTTP ${r.statusCode}`));
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => {
        const buf = Buffer.concat(chunks).toString('utf8');
        fs.mkdirSync(path.dirname(CACHE), { recursive: true });
        fs.writeFileSync(CACHE, buf);
        res(JSON.parse(buf));
      });
    }).on('error', rej);
    go(URL);
  });
}

function processFeature(qid, neFeat) {
  const { nl, eps, fullWorld } = COUNTRIES[qid];

  const geom = neFeat.geometry;
  let polys;
  if (geom.type === 'Polygon') polys = [geom.coordinates];
  else if (geom.type === 'MultiPolygon') polys = geom.coordinates;
  else throw new Error(`${nl}: unsupported geom type ${geom.type}`);

  // fullWorld (Rusland) → alle ringen, geen bbox-filter (Kaliningrad inclusief).
  // Anders: alleen ringen die binnen OAZ-bbox vallen.
  let rings = polys.map(p => p[0]);
  if (!fullWorld) rings = rings.filter(r => overlapsBBox(r, OAZ_BBOX));
  rings = rings.map(r => simplifyRing(r, eps)).filter(r => r.length >= 4);
  if (rings.length === 0) throw new Error(`${nl}: 0 rings na filter`);
  rings.sort((a, b) => shoelaceArea(b) - shoelaceArea(a));

  if (rings.length === 1) return { type: 'Polygon', coordinates: [rings[0]] };
  return { type: 'MultiPolygon', coordinates: rings.map(r => [r]) };
}

(async () => {
  const ne = await downloadNE();
  const landen = { type: 'FeatureCollection', features: [] };
  console.log(`\nMatching ${Object.keys(COUNTRIES).length} OAZ-landen uit ${ne.features.length} NE-features...\n`);

  const done = new Set();
  for (const feat of ne.features) {
    const qid = feat.properties.WIKIDATAID;
    if (!qid || !COUNTRIES[qid] || done.has(qid)) continue;
    done.add(qid);

    const { nl } = COUNTRIES[qid];
    try {
      const geometry = processFeature(qid, feat);
      const pts = countPts(geometry);
      const rings = geometry.type === 'Polygon' ? 1 : geometry.coordinates.length;
      console.log(`  ${nl.padEnd(14)} ${geometry.type.padEnd(14)} ${rings} ring${rings>1?'en':''}, ${String(pts).padStart(5)} pts`);
      landen.features.push({
        type: 'Feature',
        properties: { name: nl, sets: [86] },
        geometry,
      });
    } catch (e) {
      console.error(`  ${nl.padEnd(14)} FAIL: ${e.message}`);
    }
  }

  for (const qid of Object.keys(COUNTRIES)) {
    if (!done.has(qid)) console.error(`  MISSING: ${COUNTRIES[qid].nl} (${qid})`);
  }

  fs.writeFileSync(LANDEN_PATH, JSON.stringify(landen));
  const size = fs.statSync(LANDEN_PATH).size;
  console.log(`\n  ✓ landen-oost-azie.geojson: ${landen.features.length} features, ${Math.round(size/1024)} KB`);
})();
