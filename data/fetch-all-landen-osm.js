#!/usr/bin/env node
// Issue #78: vervang alle Europese land-polygonen in landen-europa.geojson door
// OSM admin_level=2 grenzen op consistent detailniveau.
//
// Pipeline per land:
//   1. Overpass query via wikidata-id (taalonafhankelijk, betrouwbaarder dan name)
//   2. Chain outer-role way members tot één ring per polygoon
//   3. RDP simplify — eps per land afhankelijk van schaal (micro-staat tot continent)
//   4. Dateline-filter (Rusland: Chukotka-eilanden aan -180°)
//   5. Merge terug in landen-europa.geojson, bestaande `sets` property behouden
//
// Fetcht via kumi.systems mirror (main-Overpass wordt vaak overbelast bij grote
// admin-queries). 3s pauze tussen queries = 40 queries × 3s ≈ 2 min totaal.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT_DIR     = path.join(__dirname, 'overpass');
const LANDEN_PATH = path.join(__dirname, '..', 'landen-europa.geojson');
// Meerdere mirrors — bij HTML-error / 429 roteren we door de lijst.
const OVERPASS_HOSTS = [
  'overpass.kumi.systems',
  'overpass-api.de',
  'overpass.openstreetmap.fr',
];

// NL-naam → { qid, eps }. qid = Wikidata Q-code voor het land.
// eps = RDP-precisie in graden. EU-schaal default = 0.005 (≈500m). Rusland en Turkije
// hebben een enorme landoppervlakte buiten Europa — zonder grovere eps wordt hun
// polygon onnodig zwaar (set 7.1 shows maar een gedeelte, niet de hele Siberische kust).
const COUNTRIES = {
  'Nederland':            { qid: 'Q55',  eps: 0.005 },
  'België':               { qid: 'Q31',  eps: 0.005 },
  'Luxemburg':            { qid: 'Q32',  eps: 0.003 },  // klein land, meer detail
  'Duitsland':            { qid: 'Q183', eps: 0.008 },
  'Frankrijk':            { qid: 'Q142', eps: 0.008 },
  'Oostenrijk':           { qid: 'Q40',  eps: 0.005 },
  'Zwitserland':          { qid: 'Q39',  eps: 0.005 },
  'Denemarken':           { qid: 'Q35',  eps: 0.005 },
  'Noorwegen':            { qid: 'Q20',  eps: 0.015 },  // lange ragfijne kust, veel fjorden
  'Zweden':               { qid: 'Q34',  eps: 0.010 },
  'Finland':              { qid: 'Q33',  eps: 0.010 },
  'IJsland':              { qid: 'Q189', eps: 0.008 },
  'Verenigd Koninkrijk':  { qid: 'Q145', eps: 0.008 },
  'Ierland':              { qid: 'Q27',  eps: 0.005 },
  'Portugal':             { qid: 'Q45',  eps: 0.005 },
  'Spanje':               { qid: 'Q29',  eps: 0.008 },
  'Italië':               { qid: 'Q38',  eps: 0.005 },
  'Griekenland':          { qid: 'Q41',  eps: 0.008 },  // veel eilanden
  'Hongarije':            { qid: 'Q28',  eps: 0.005 },
  'Tsjechië':             { qid: 'Q213', eps: 0.005 },
  'Slowakije':            { qid: 'Q214', eps: 0.005 },
  'Polen':                { qid: 'Q36',  eps: 0.008 },
  'Roemenië':             { qid: 'Q218', eps: 0.008 },
  'Bulgarije':            { qid: 'Q219', eps: 0.005 },
  'Slovenië':             { qid: 'Q215', eps: 0.003 },
  'Kroatië':              { qid: 'Q224', eps: 0.005 },
  'Bosnië-Hercegovina':   { qid: 'Q225', eps: 0.005 },
  'Servië':               { qid: 'Q403', eps: 0.005 },
  'Montenegro':           { qid: 'Q236', eps: 0.003 },
  'Albanië':              { qid: 'Q222', eps: 0.003 },
  'Noord-Macedonië':      { qid: 'Q221', eps: 0.003 },
  'Turkije':              { qid: 'Q43',  eps: 0.015 },
  'Cyprus':               { qid: 'Q229', eps: 0.003 },
  'Rusland':              { qid: 'Q159', eps: 0.050 },  // continentaal — eps hoog om file op orde te houden
  'Wit-Rusland':          { qid: 'Q184', eps: 0.008 },
  'Oekraïne':             { qid: 'Q212', eps: 0.010 },
  'Moldavië':             { qid: 'Q217', eps: 0.003 },
  'Estland':              { qid: 'Q191', eps: 0.005 },
  'Letland':              { qid: 'Q211', eps: 0.005 },
  'Litouwen':             { qid: 'Q37',  eps: 0.005 },
};

const DEFAULT_MAX_GAP = 1.0;  // in graden — ruim genoeg voor eilandengroepen / multipolygoon

// ── Utils ───────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchOverpassOnce(q, host) {
  return new Promise((res, rej) => {
    const body = 'data=' + encodeURIComponent('[out:json][timeout:300];' + q);
    const req = https.request({
      hostname: host, path: '/api/interpreter', method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'topoquiz-data-fetch/1.0 (https://www.topoquiz.com)',
      },
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)); });
    req.on('error', rej);
    req.write(body); req.end();
  });
}

// Probeer alle mirrors achter elkaar; bij HTML of netwerkerror → volgende mirror met backoff.
async function fetchOverpass(q) {
  let lastErr = null;
  for (let attempt = 0; attempt < OVERPASS_HOSTS.length; attempt++) {
    const host = OVERPASS_HOSTS[attempt];
    try {
      const raw = await fetchOverpassOnce(q, host);
      if (raw.trimStart().startsWith('<')) {
        lastErr = new Error(`HTML response van ${host}`);
        await sleep(2000 * (attempt + 1));
        continue;
      }
      return raw;
    } catch (e) {
      lastErr = e;
      await sleep(2000 * (attempt + 1));
    }
  }
  throw lastErr || new Error('alle mirrors faalden');
}

function dist(a, b) { return Math.hypot(a[0]-b[0], a[1]-b[1]); }

function perpendicularDist(p, a, b) {
  const dx = b[0]-a[0], dy = b[1]-a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0]-a[0], p[1]-a[1]);
  const t = ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / (dx*dx + dy*dy);
  return Math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy));
}

// Iteratieve RDP — recursie knalt bij rings van 5k+ punten (Duitsland, Tsjechië).
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

// Chain segmenten tot een ring. Probeert eerst aan staart, dan aan kop.
// Retourneert array van rings (meerdere rings = multipolygoon-onderdelen).
function chainToRings(ways, maxGap) {
  const segs = ways.map(w => w.geometry.map(n => [n.lon, n.lat]));
  const rings = [];
  const used = new Set();

  while (used.size < segs.length) {
    // Start een nieuwe ring met de eerste ongebruikte segment.
    let startIdx = -1;
    for (let i = 0; i < segs.length; i++) if (!used.has(i)) { startIdx = i; break; }
    if (startIdx === -1) break;
    const result = segs[startIdx].slice();
    used.add(startIdx);

    let progressed = true;
    while (progressed) {
      progressed = false;

      // Tail
      const tail = result[result.length-1];
      let bestIdx = -1, reversed = false, bestDist = Infinity;
      for (let i = 0; i < segs.length; i++) {
        if (used.has(i)) continue;
        const s = segs[i];
        const d1 = dist(tail, s[0]), d2 = dist(tail, s[s.length-1]);
        if (d1 < bestDist) { bestDist = d1; bestIdx = i; reversed = false; }
        if (d2 < bestDist) { bestDist = d2; bestIdx = i; reversed = true; }
      }
      if (bestIdx !== -1 && bestDist <= maxGap) {
        const seg = reversed ? segs[bestIdx].slice().reverse() : segs[bestIdx];
        for (let k = 1; k < seg.length; k++) result.push(seg[k]);
        used.add(bestIdx);
        progressed = true;
        continue;
      }

      // Head
      const head = result[0];
      bestIdx = -1; reversed = false; bestDist = Infinity;
      for (let i = 0; i < segs.length; i++) {
        if (used.has(i)) continue;
        const s = segs[i];
        const d1 = dist(head, s[0]), d2 = dist(head, s[s.length-1]);
        if (d1 < bestDist) { bestDist = d1; bestIdx = i; reversed = true; }
        if (d2 < bestDist) { bestDist = d2; bestIdx = i; reversed = false; }
      }
      if (bestIdx !== -1 && bestDist <= maxGap) {
        const seg = reversed ? segs[bestIdx].slice().reverse() : segs[bestIdx];
        const prefix = seg.slice(0, -1);
        for (let k = prefix.length - 1; k >= 0; k--) result.unshift(prefix[k]);
        used.add(bestIdx);
        progressed = true;
      }
    }

    // Sluit ring
    if (dist(result[0], result[result.length-1]) > 1e-6) result.push(result[0]);
    rings.push(result);
  }

  return rings;
}

// Chukotka en enkele dateline-eilanden liggen aan -180°E. Voor Europa-schaal
// willen we deze niet (maken fitBounds() wereldwijd). Drop rings waarvan de
// west-rand < -170 is.
function dropDatelineRings(rings) {
  return rings.filter(ring => {
    let minLon = Infinity;
    for (let i = 0; i < ring.length; i++) if (ring[i][0] < minLon) minLon = ring[i][0];
    return minLon > -170;
  });
}

function simplifyRing(ring, eps) {
  const simp = rdp(ring, eps).map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);
  const first = simp[0], last = simp[simp.length-1];
  if (first[0] !== last[0] || first[1] !== last[1]) simp.push(first);
  return simp;
}

function countPts(geom) {
  if (geom.type === 'Polygon') return geom.coordinates.reduce((n,r)=>n+r.length,0);
  return geom.coordinates.reduce((n,p)=>n+p.reduce((nn,r)=>nn+r.length,0),0);
}

// Sorteer rings op oppervlak (benaderend via shoelace). Grootste = outer (in gevallen
// waar we outer/inner moeten splitsen); voor landen zonder enclaves is alleen outer
// van belang, dus sorteren we op oppervlak en behouden de grootste N.
function shoelaceArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i][0] * ring[i+1][1] - ring[i+1][0] * ring[i][1];
  }
  return Math.abs(a) / 2;
}

// ── Main ─────────────────────────────────────────────────────────────

async function fetchCountry(nlName, qid) {
  const outFile = path.join(OUT_DIR, `land-${qid}.json`);
  if (fs.existsSync(outFile)) {
    try {
      const d = JSON.parse(fs.readFileSync(outFile, 'utf8'));
      if (Array.isArray(d.elements) && d.elements.length > 0) {
        return { raw: d, cached: true };
      }
    } catch {}
  }
  // Geen admin_level-filter: Nederland is admin_level=3 (onderdeel van Koninkrijk,
  // admin_level=2). Wikidata-id is al uniek genoeg.
  const q = `relation["wikidata"="${qid}"]["boundary"="administrative"];out geom qt;`;
  const raw = await fetchOverpass(q);
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.elements) || parsed.elements.length === 0) {
    throw new Error(`0 elementen voor ${nlName} (${qid})`);
  }
  fs.writeFileSync(outFile, JSON.stringify(parsed));
  return { raw: parsed, cached: false };
}

function processCountry(nlName, raw, eps) {
  const rel = raw.elements.find(e => e.type === 'relation');
  if (!rel) throw new Error(`Geen relatie voor ${nlName}`);
  // Outer way-members (skip inner enclaves, die we niet als 'hole' willen).
  const ways = rel.members.filter(m =>
    m.type === 'way' && m.geometry && (m.role === 'outer' || m.role === '')
  );
  if (ways.length === 0) throw new Error(`Geen outer-ways voor ${nlName}`);

  let rings = chainToRings(ways, DEFAULT_MAX_GAP);
  rings = dropDatelineRings(rings);
  if (nlName === 'Rusland') {
    // Rusland: behoud alleen ringen met oppervlak > 1% van de grootste ring
    // (filtert honderden eilandjes uit de zee van Ochotsk etc.).
    const areas = rings.map(shoelaceArea);
    const max = Math.max(...areas);
    rings = rings.filter((_, i) => areas[i] > max * 0.01);
  }

  rings = rings
    .map(r => simplifyRing(r, eps))
    .filter(r => r.length >= 4);

  if (rings.length === 0) throw new Error(`Geen rings na simplify voor ${nlName}`);

  // Sorteer op oppervlak aflopend; grootste eerst.
  rings.sort((a, b) => shoelaceArea(b) - shoelaceArea(a));

  if (rings.length === 1) return { type: 'Polygon', coordinates: [rings[0]] };
  return { type: 'MultiPolygon', coordinates: rings.map(r => [r]) };
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const existing = JSON.parse(fs.readFileSync(LANDEN_PATH, 'utf8'));

  const entries = Object.entries(COUNTRIES);
  console.log(`Fetching ${entries.length} Europese landen uit OSM (mirrors: ${OVERPASS_HOSTS.join(', ')})...\n`);

  for (let i = 0; i < entries.length; i++) {
    const [nlName, { qid, eps }] = entries[i];
    try {
      process.stdout.write(`[${String(i+1).padStart(2)}/${entries.length}] ${nlName.padEnd(22)} `);
      const { raw, cached } = await fetchCountry(nlName, qid);
      process.stdout.write(cached ? '(cache) ' : '(fetch) ');

      const geometry = processCountry(nlName, raw, eps);
      const pts = countPts(geometry);
      process.stdout.write(`${geometry.type.padEnd(14)} ${String(pts).padStart(4)} pts\n`);

      // Preserve bestaande sets, anders defaulten naar [71]
      const existingFeat = existing.features.find(f => f.properties.name === nlName);
      const sets = existingFeat?.properties.sets || [71];
      const feature = {
        type: 'Feature',
        properties: { name: nlName, sets },
        geometry,
      };
      const idx = existing.features.findIndex(f => f.properties.name === nlName);
      if (idx >= 0) existing.features[idx] = feature;
      else existing.features.push(feature);

      if (!cached) await sleep(3000);
    } catch (e) {
      console.error(`FAIL: ${e.message}`);
    }
  }

  fs.writeFileSync(LANDEN_PATH, JSON.stringify(existing));
  const newSize = fs.statSync(LANDEN_PATH).size;
  console.log(`\n  ✓ landen-europa.geojson bijgewerkt: ${existing.features.length} features, ${Math.round(newSize/1024)} KB`);
})();
