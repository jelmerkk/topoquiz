#!/usr/bin/env node
// Issue #78 vervolg: echte kustlijnen via Natural Earth 1:10m admin_0_countries.
//
// OSM admin_level=2 volgde de 12-mijlszeegrens (territorial waters) i.p.v. de
// echte kust, waardoor kleine eilanden visueel opgeblazen waren en naburige
// eilanden elkaar visueel overlapten. Natural Earth is cartografisch: kust =
// echte kust, eilanden zijn aparte rings in MultiPolygon.
//
// Pipeline:
//   1. Download NE 10m admin_0_countries (eenmalig, ~30 MB)
//   2. Match per land op WIKIDATAID (taalonafhankelijk) → fallback NAME_LONG
//   3. Filter rings die buiten Europa vallen (Aruba/Frans-Guyana/etc.)
//   4. RDP-simplify per land (NE is al generalized, eps mag 0.02-0.05)
//   5. Preserve bestaande `sets` per land.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson';
const LANDEN_PATH = path.join(__dirname, '..', 'landen-europa.geojson');
const CACHE = path.join(__dirname, 'natural-earth', 'ne_10m_admin_0_countries.geojson');

// Europa-bbox: alleen rings waarvan de bbox (deels) binnen dit vierkant valt
// tellen we mee. Filtert Aruba/Curaçao (NL), Frans-Guyana (FR), Kanaaleilanden
// (VK), Azoren (PT — willen we WEL, dus PT-exception), Canarische (ES — ook
// WEL). Precieze grenzen per land onderaan (CUSTOM_BBOX).
const EUROPE_BBOX = { minLon: -32, maxLon: 70, minLat: 27, maxLat: 82 };

// qid → { nl, eps }.  eps = RDP-precisie in graden.  NE 10m is al gegeneraliseerd
// voor zoom 6-9, dus eps 0.02 (≈2 km) geeft voldoende detail zonder bulk.
const COUNTRIES = {
  Q55:   { nl: 'Nederland',           eps: 0.015 },
  Q31:   { nl: 'België',              eps: 0.015 },
  Q32:   { nl: 'Luxemburg',           eps: 0.010 },
  Q183:  { nl: 'Duitsland',           eps: 0.025 },
  Q142:  { nl: 'Frankrijk',           eps: 0.025 },
  Q40:   { nl: 'Oostenrijk',          eps: 0.020 },
  Q39:   { nl: 'Zwitserland',         eps: 0.015 },
  Q35:   { nl: 'Denemarken',          eps: 0.015 },
  Q20:   { nl: 'Noorwegen',           eps: 0.040 },  // veel fjorden, maar grote schaal
  Q34:   { nl: 'Zweden',              eps: 0.030 },
  Q33:   { nl: 'Finland',             eps: 0.030 },
  Q189:  { nl: 'IJsland',             eps: 0.025 },
  Q145:  { nl: 'Verenigd Koninkrijk', eps: 0.025 },
  Q27:   { nl: 'Ierland',             eps: 0.020 },
  Q45:   { nl: 'Portugal',            eps: 0.020 },
  Q29:   { nl: 'Spanje',              eps: 0.025 },
  Q38:   { nl: 'Italië',              eps: 0.020 },
  Q41:   { nl: 'Griekenland',         eps: 0.020 },
  Q28:   { nl: 'Hongarije',           eps: 0.020 },
  Q213:  { nl: 'Tsjechië',            eps: 0.020 },
  Q214:  { nl: 'Slowakije',           eps: 0.020 },
  Q36:   { nl: 'Polen',               eps: 0.025 },
  Q218:  { nl: 'Roemenië',            eps: 0.025 },
  Q219:  { nl: 'Bulgarije',           eps: 0.020 },
  Q215:  { nl: 'Slovenië',            eps: 0.010 },
  Q224:  { nl: 'Kroatië',             eps: 0.020 },
  Q225:  { nl: 'Bosnië-Hercegovina',  eps: 0.020 },
  Q403:  { nl: 'Servië',              eps: 0.020 },
  Q236:  { nl: 'Montenegro',          eps: 0.010 },
  Q222:  { nl: 'Albanië',             eps: 0.015 },
  Q221:  { nl: 'Noord-Macedonië',     eps: 0.015 },
  Q43:   { nl: 'Turkije',             eps: 0.050 },
  Q229:  { nl: 'Cyprus',              eps: 0.010 },
  Q159:  { nl: 'Rusland',             eps: 0.080 },
  Q184:  { nl: 'Wit-Rusland',         eps: 0.025 },
  Q212:  { nl: 'Oekraïne',            eps: 0.030 },
  Q217:  { nl: 'Moldavië',            eps: 0.015 },
  Q191:  { nl: 'Estland',             eps: 0.020 },
  Q211:  { nl: 'Letland',             eps: 0.020 },
  Q37:   { nl: 'Litouwen',            eps: 0.020 },
};

// Per-land bbox-override: standaard Europa, maar sommige landen willen we breder
// (PT/ES voor Azoren/Canarische eilanden). Een ring mag alleen blijven als hij
// tenminste deels overlapt met deze bbox.
const CUSTOM_BBOX = {
  Q45:  { minLon: -32, maxLon:  -5, minLat: 30, maxLat: 45 }, // Portugal + Azoren + Madeira
  Q29:  { minLon: -19, maxLon:   5, minLat: 27, maxLat: 45 }, // Spanje + Canarische
  Q159: { minLon:  18, maxLon: 180, minLat: 41, maxLat: 82 }, // Rusland europees+siberisch (drop Kaliningrad niet — zit al in range)
};

// Voor Rusland: dateline-wrap (Chukotka duikt op aan -180°). Drop rings met
// minLon < -170.
const DROP_DATELINE_RINGS = new Set(['Q159']);

// ── Utils ───────────────────────────────────────────────────────────

function perpendicularDist(p, a, b) {
  const dx = b[0]-a[0], dy = b[1]-a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0]-a[0], p[1]-a[1]);
  const t = ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / (dx*dx + dy*dy);
  return Math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy));
}

// Iteratieve RDP (recursie knalt op grote rings).
function rdp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = 1; keep[pts.length-1] = 1;
  const stack = [[0, pts.length-1]];
  while (stack.length) {
    const [lo, hi] = stack.pop();
    if (hi <= lo + 1) continue;
    let maxD = 0, maxI = -1;
    const a = pts[lo], b = pts[hi];
    for (let i = lo+1; i < hi; i++) {
      const d = perpendicularDist(pts[i], a, b);
      if (d > maxD) { maxD = d; maxI = i; }
    }
    if (maxD > eps && maxI !== -1) {
      keep[maxI] = 1;
      stack.push([lo, maxI]);
      stack.push([maxI, hi]);
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

// ── Main ─────────────────────────────────────────────────────────────

function processFeature(qid, neFeat) {
  const { nl, eps } = COUNTRIES[qid];
  const bbox = CUSTOM_BBOX[qid] || EUROPE_BBOX;

  // Normaliseer naar MultiPolygon-rings.
  const geom = neFeat.geometry;
  let polys;
  if (geom.type === 'Polygon') polys = [geom.coordinates];
  else if (geom.type === 'MultiPolygon') polys = geom.coordinates;
  else throw new Error(`${nl}: unsupported geom type ${geom.type}`);

  // Elk "polygon" = outer ring + eventueel inner holes. Voor landen-weergave
  // willen we alleen de outer ring (index 0) — geen enclave-gaten.
  const outerRings = polys.map(p => p[0]);

  // Filter dateline (Rusland: Chukotka aan -180°)
  let rings = outerRings;
  if (DROP_DATELINE_RINGS.has(qid)) {
    rings = rings.filter(r => ringBBox(r).minLon > -170);
  }

  // Filter rings die volledig buiten Europa-bbox liggen.
  rings = rings.filter(r => overlapsBBox(r, bbox));

  // Simplify + sorteer op oppervlak (grootste eerst).
  rings = rings.map(r => simplifyRing(r, eps)).filter(r => r.length >= 4);
  if (rings.length === 0) throw new Error(`${nl}: 0 rings na filter`);
  rings.sort((a, b) => shoelaceArea(b) - shoelaceArea(a));

  if (rings.length === 1) return { type: 'Polygon', coordinates: [rings[0]] };
  return { type: 'MultiPolygon', coordinates: rings.map(r => [r]) };
}

(async () => {
  const ne = await downloadNE();
  const landen = JSON.parse(fs.readFileSync(LANDEN_PATH, 'utf8'));

  console.log(`\nMatching ${Object.keys(COUNTRIES).length} Europese landen uit ${ne.features.length} NE-features...\n`);

  const done = new Set();
  for (const feat of ne.features) {
    const qid = feat.properties.WIKIDATAID;
    if (!qid || !COUNTRIES[qid] || done.has(qid)) continue;
    done.add(qid);

    const { nl } = COUNTRIES[qid];
    try {
      const geometry = processFeature(qid, feat);
      const pts = countPts(geometry);
      console.log(`  ${nl.padEnd(22)} ${geometry.type.padEnd(14)} ${String(pts).padStart(4)} pts`);

      const existing = landen.features.find(f => f.properties.name === nl);
      const sets = existing?.properties.sets || [71];
      const newFeat = {
        type: 'Feature',
        properties: { name: nl, sets },
        geometry,
      };
      const idx = landen.features.findIndex(f => f.properties.name === nl);
      if (idx >= 0) landen.features[idx] = newFeat;
      else landen.features.push(newFeat);
    } catch (e) {
      console.error(`  ${nl.padEnd(22)} FAIL: ${e.message}`);
    }
  }

  for (const qid of Object.keys(COUNTRIES)) {
    if (!done.has(qid)) console.error(`  MISSING: ${COUNTRIES[qid].nl} (${qid})`);
  }

  fs.writeFileSync(LANDEN_PATH, JSON.stringify(landen));
  const size = fs.statSync(LANDEN_PATH).size;
  console.log(`\n  ✓ landen-europa.geojson: ${landen.features.length} features, ${Math.round(size/1024)} KB`);
})();
