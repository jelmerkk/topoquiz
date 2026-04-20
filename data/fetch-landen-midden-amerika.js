#!/usr/bin/env node
// Issue #57 (set 8.9 Midden-Amerika en Caraïben): Natural Earth 1:10m
// admin_0_countries → landen-midden-amerika.geojson voor de 11 opdracht-landen.
//
// Caraïben: Cuba Q241, Jamaica Q766, Haïti Q790, Dom Rep Q786.
// Midden-Amerika: Guatemala Q774, Belize Q242, Honduras Q783, El Salvador Q792,
// Nicaragua Q811, Costa Rica Q800, Panama Q804.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson';
const DEST  = path.join(__dirname, '..', 'landen-midden-amerika.geojson');
const CACHE = path.join(__dirname, 'natural-earth', 'ne_10m_admin_0_countries.geojson');

// Bbox: Guatemala-west (~-92°E) tot Dom Rep-oost (~-68°E), Panama-zuid (~7°N)
// tot Cuba-noord (~24°N). Ruime marge zodat NE kusteilanden meekomen.
const BBOX = { minLon: -95, maxLon: -67, minLat: 6, maxLat: 25 };

const COUNTRIES = {
  Q241: { nl: 'Cuba',                  eps: 0.020 },
  Q766: { nl: 'Jamaica',               eps: 0.015 },
  Q790: { nl: 'Haïti',                 eps: 0.015 },
  Q786: { nl: 'Dominicaanse Republiek',eps: 0.015 },
  Q774: { nl: 'Guatemala',             eps: 0.020 },
  Q242: { nl: 'Belize',                eps: 0.015 },
  Q783: { nl: 'Honduras',              eps: 0.020 },
  Q792: { nl: 'El Salvador',           eps: 0.015 },
  Q811: { nl: 'Nicaragua',             eps: 0.020 },
  Q800: { nl: 'Costa Rica',            eps: 0.015 },
  Q804: { nl: 'Panama',                eps: 0.020 },
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

function processFeature(qid, neFeat, eps) {
  const geom = neFeat.geometry;
  let polys;
  if (geom.type === 'Polygon') polys = [geom.coordinates];
  else if (geom.type === 'MultiPolygon') polys = geom.coordinates;
  else throw new Error(`unsupported geom ${geom.type}`);

  let rings = polys.map(p => p[0]).filter(r => overlapsBBox(r, BBOX));
  rings = rings.map(r => simplifyRing(r, eps)).filter(r => r.length >= 4);
  if (rings.length === 0) throw new Error(`0 rings na filter`);
  rings.sort((a, b) => shoelaceArea(b) - shoelaceArea(a));

  if (rings.length === 1) return { type: 'Polygon', coordinates: [rings[0]] };
  return { type: 'MultiPolygon', coordinates: rings.map(r => [r]) };
}

(async () => {
  const ne = await downloadNE();
  const fc = { type: 'FeatureCollection', features: [] };
  console.log(`\nNE-features: ${ne.features.length}\n`);

  const done = new Set();
  for (const feat of ne.features) {
    const qid = feat.properties.WIKIDATAID;
    if (!qid || !COUNTRIES[qid] || done.has(qid)) continue;
    done.add(qid);
    const { nl, eps } = COUNTRIES[qid];
    try {
      const geometry = processFeature(qid, feat, eps);
      const pts = countPts(geometry);
      const rings = geometry.type === 'Polygon' ? 1 : geometry.coordinates.length;
      console.log(`  ${nl.padEnd(24)} ${geometry.type.padEnd(14)} ${rings} ring${rings>1?'en':''}, ${String(pts).padStart(5)} pts`);
      fc.features.push({ type:'Feature', properties:{ name: nl, sets: [89] }, geometry });
    } catch (e) { console.error(`  ${nl.padEnd(24)} FAIL: ${e.message}`); }
  }
  const missing = Object.keys(COUNTRIES).filter(q => !done.has(q));
  if (missing.length) console.error(`\n  MISSING: ${missing.join(', ')}`);

  fs.writeFileSync(DEST, JSON.stringify(fc));
  console.log(`\n  ✓ landen-midden-amerika.geojson: ${fc.features.length} features, ${Math.round(fs.statSync(DEST).size/1024)} KB`);
})();
