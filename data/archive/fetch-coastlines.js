#!/usr/bin/env node
// Fetches OSM natural=coastline ways for polygon accuracy (#37).
// Skips files that already exist. Rate-limit aware.

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const OUT   = path.join(__dirname, 'overpass');

const TARGETS = [
  // Noordzee: only SW corner near Zeeland needs fixing
  { name: 'coast-zeeland-west',    bbox: '51.44,3.35,51.65,3.85' },
  // Waddenzee: mainland south shore (split in two)
  { name: 'coast-mainland-waddenzee-w', bbox: '52.85,4.60,53.42,5.90' },
  { name: 'coast-mainland-waddenzee-e', bbox: '52.85,5.90,53.42,7.25' },
  // Wadden islands (south-facing coast for Waddenzee polygon)
  { name: 'wadden-texel',          bbox: '52.95,4.70,53.22,4.98' },
  { name: 'wadden-vlieland',       bbox: '53.16,4.88,53.32,5.20' },
  { name: 'wadden-terschelling',   bbox: '53.34,5.17,53.45,5.58' },
  { name: 'wadden-ameland',        bbox: '53.40,5.53,53.50,5.90' },
  { name: 'wadden-schiermonnikoog',bbox: '53.46,6.08,53.52,6.35' },
  // Oosterschelde inner coastline
  { name: 'coast-oosterschelde',   bbox: '51.44,3.55,51.78,4.30' },
  // Westerschelde shores
  { name: 'coast-westerschelde',   bbox: '51.34,3.30,51.62,4.30' },
  // Eems/Dollard: German east side only
  { name: 'coast-germany-eems',    bbox: '53.10,7.00,53.48,7.40' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function checkStatus() {
  return new Promise((res, rej) => {
    https.get('https://overpass-api.de/api/status', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
    }).on('error', rej);
  });
}

async function waitForSlot() {
  while (true) {
    const s = await checkStatus();
    const avail = s.match(/(\d+) slots available now/);
    if (avail && parseInt(avail[1]) > 0) return;
    const m = s.match(/in (\d+) seconds/);
    const wait = m ? (parseInt(m[1]) + 2) * 1000 : 20000;
    console.log(`  rate limited — waiting ${Math.ceil(wait/1000)}s`);
    await sleep(wait);
  }
}

function query(bbox) {
  return new Promise((res, rej) => {
    const body = 'data=' + encodeURIComponent(`[out:json][timeout:60];way[natural=coastline](${bbox});out geom;`);
    const req = https.request({
      hostname: 'overpass-api.de', path: '/api/interpreter', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)); });
    req.on('error', rej);
    req.write(body); req.end();
  });
}

(async () => {
  for (const t of TARGETS) {
    const fp = path.join(OUT, t.name + '.json');
    if (fs.existsSync(fp)) {
      try {
        const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
        if (Array.isArray(d.elements) && d.elements.length > 0) {
          console.log(`✓ ${t.name} — skip (${d.elements.length} ways)`);
          continue;
        }
      } catch {}
    }
    await waitForSlot();
    process.stdout.write(`fetching ${t.name}... `);
    try {
      const raw = await query(t.bbox);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.elements)) throw new Error(raw.slice(0, 80));
      fs.writeFileSync(fp, JSON.stringify(parsed, null, 2));
      console.log(`${parsed.elements.length} ways`);
    } catch (e) {
      console.log(`ERROR: ${e.message.slice(0, 60)}`);
    }
    await sleep(3000);
  }
  console.log('\nDone.');
})();
