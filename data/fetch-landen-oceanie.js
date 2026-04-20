#!/usr/bin/env node
// Issue #56 (set 8.8 Australië en Nieuw-Zeeland): Natural Earth 1:10m
// admin_0_countries → landen-oceanie.geojson + antarctica-polygon naar
// aparte file voor gebied-rendering.
//
// Landen: Australië (Q408), Nieuw-Zeeland (Q664), Papoea-Nieuw-Guinea (Q691).
// Antarctica (Q51) zit ook in NE admin_0 maar render ik als gebied (continent).

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson';
const LANDEN_PATH  = path.join(__dirname, '..', 'landen-oceanie.geojson');
const GEBIED_PATH  = path.join(__dirname, '..', 'gebieden-oceanie.geojson');
const CACHE = path.join(__dirname, 'natural-earth', 'ne_10m_admin_0_countries.geojson');

// Bbox Oceanië: Australia-west (~110°E) tot Chatham-eilanden (~-176°W ~ 184°E),
// Papoea-noord (~0°N) tot Tasmanië-zuid (~-48°S). Voor NZ's Chatham oostwaarts
// van 180°E wrap: NE geeft Chatham als lon>180 niet, dus bbox tot 180.
const BBOX = { minLon: 110, maxLon: 180, minLat: -48, maxLat: 1 };

const COUNTRIES = {
  Q408: { nl: 'Australië',          eps: 0.030 },
  Q664: { nl: 'Nieuw-Zeeland',      eps: 0.020 },
  Q691: { nl: 'Papoea-Nieuw-Guinea',eps: 0.025 },
};

// Antarctica aparte handling: geen bbox-filter (global ring), hoge eps want
// kust is grillig maar op quiz-zoom hoeft dat niet exact.
const ANTARCTICA = { qid: 'Q51', nl: 'Antarctica', eps: 0.080 };

// Tasmanië: extract uit Australië's rings. Bass Strait zit rond -39.2°;
// cutoff maxLat -39.5 isoleert Tasmania-eiland + kleine randeilanden van
// het Australische vasteland.
const TASMANIA_BBOX = { minLon: 143.5, maxLon: 149.0, minLat: -44.0, maxLat: -39.5 };
const TASMANIA = { nl: 'Tasmanië', eps: 0.015 };

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

function processFeature(qid, neFeat, eps, useBbox) {
  const geom = neFeat.geometry;
  let polys;
  if (geom.type === 'Polygon') polys = [geom.coordinates];
  else if (geom.type === 'MultiPolygon') polys = geom.coordinates;
  else throw new Error(`unsupported geom ${geom.type}`);

  let rings = polys.map(p => p[0]);
  if (useBbox) rings = rings.filter(r => overlapsBBox(r, BBOX));
  rings = rings.map(r => simplifyRing(r, eps)).filter(r => r.length >= 4);
  if (rings.length === 0) throw new Error(`0 rings na filter`);
  rings.sort((a, b) => shoelaceArea(b) - shoelaceArea(a));

  if (rings.length === 1) return { type: 'Polygon', coordinates: [rings[0]] };
  return { type: 'MultiPolygon', coordinates: rings.map(r => [r]) };
}

(async () => {
  const ne = await downloadNE();
  const landen  = { type: 'FeatureCollection', features: [] };
  const gebied  = { type: 'FeatureCollection', features: [] };
  console.log(`\nNE-features: ${ne.features.length}\n`);

  // Landen
  const doneL = new Set();
  for (const feat of ne.features) {
    const qid = feat.properties.WIKIDATAID;
    if (!qid || !COUNTRIES[qid] || doneL.has(qid)) continue;
    doneL.add(qid);
    const { nl, eps } = COUNTRIES[qid];
    try {
      const geometry = processFeature(qid, feat, eps, true);
      const pts = countPts(geometry);
      const rings = geometry.type === 'Polygon' ? 1 : geometry.coordinates.length;
      console.log(`  ${nl.padEnd(22)} ${geometry.type.padEnd(14)} ${rings} ring${rings>1?'en':''}, ${String(pts).padStart(5)} pts`);
      landen.features.push({ type:'Feature', properties:{ name: nl, sets: [88] }, geometry });
    } catch (e) { console.error(`  ${nl.padEnd(22)} FAIL: ${e.message}`); }
  }

  // Tasmanië → gebied. Extract rings uit Australia-feature die volledig
  // binnen TASMANIA_BBOX vallen (Bass Strait >-39.5° snijdt vasteland af).
  const auFeat = ne.features.find(f => f.properties.WIKIDATAID === 'Q408');
  if (auFeat) {
    try {
      const polys = auFeat.geometry.type === 'Polygon' ? [auFeat.geometry.coordinates] : auFeat.geometry.coordinates;
      let tasRings = polys.map(p => p[0]).filter(r => {
        const bb = ringBBox(r);
        return bb.minLon >= TASMANIA_BBOX.minLon && bb.maxLon <= TASMANIA_BBOX.maxLon &&
               bb.minLat >= TASMANIA_BBOX.minLat && bb.maxLat <= TASMANIA_BBOX.maxLat;
      });
      tasRings = tasRings.map(r => simplifyRing(r, TASMANIA.eps)).filter(r => r.length >= 4);
      if (tasRings.length === 0) throw new Error('0 rings in Tasmania-bbox');
      tasRings.sort((a, b) => shoelaceArea(b) - shoelaceArea(a));
      const geometry = tasRings.length === 1
        ? { type: 'Polygon', coordinates: [tasRings[0]] }
        : { type: 'MultiPolygon', coordinates: tasRings.map(r => [r]) };
      const pts = countPts(geometry);
      const rings = geometry.type === 'Polygon' ? 1 : geometry.coordinates.length;
      console.log(`  ${TASMANIA.nl.padEnd(22)} ${geometry.type.padEnd(14)} ${rings} ring${rings>1?'en':''}, ${String(pts).padStart(5)} pts`);
      gebied.features.push({ type:'Feature', properties:{ name: TASMANIA.nl, sets:[88] }, geometry });
    } catch (e) { console.error(`  Tasmanië FAIL: ${e.message}`); }
  }

  // Antarctica → gebied
  const antFeat = ne.features.find(f => f.properties.WIKIDATAID === ANTARCTICA.qid);
  if (antFeat) {
    try {
      const geometry = processFeature(ANTARCTICA.qid, antFeat, ANTARCTICA.eps, false);
      const pts = countPts(geometry);
      const rings = geometry.type === 'Polygon' ? 1 : geometry.coordinates.length;
      console.log(`  ${ANTARCTICA.nl.padEnd(22)} ${geometry.type.padEnd(14)} ${rings} ring${rings>1?'en':''}, ${String(pts).padStart(5)} pts`);
      gebied.features.push({ type:'Feature', properties:{ name: ANTARCTICA.nl, sets:[88] }, geometry });
    } catch (e) { console.error(`  Antarctica FAIL: ${e.message}`); }
  } else {
    console.error(`  Antarctica MISSING (Q51 niet in NE)`);
  }

  fs.writeFileSync(LANDEN_PATH, JSON.stringify(landen));
  fs.writeFileSync(GEBIED_PATH, JSON.stringify(gebied));
  console.log(`\n  ✓ landen-oceanie.geojson:    ${landen.features.length} features, ${Math.round(fs.statSync(LANDEN_PATH).size/1024)} KB`);
  console.log(`  ✓ gebieden-oceanie.geojson: ${gebied.features.length} features, ${Math.round(fs.statSync(GEBIED_PATH).size/1024)} KB`);
})();
