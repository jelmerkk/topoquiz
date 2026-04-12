#!/usr/bin/env node
// Fetches OSM relation 3123125 (Dollard / Dollart, natural=bay) with full geometry.
// Saves to data/overpass/dollard-relation.json. Skips if already present.

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const OUT   = path.join(__dirname, 'overpass');
const FILE  = path.join(OUT, 'dollard-relation.json');

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

function fetchRelation() {
  return new Promise((res, rej) => {
    const body = 'data=' + encodeURIComponent('[out:json][timeout:60];relation(3123125);out geom;');
    const req = https.request({
      hostname: 'overpass-api.de', path: '/api/interpreter', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)); });
    req.on('error', rej);
    req.write(body); req.end();
  });
}

(async () => {
  if (fs.existsSync(FILE)) {
    try {
      const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      if (d.elements?.length > 0) {
        console.log(`✓ dollard-relation.json already present (${d.elements.length} elements) — skipping`);
        return;
      }
    } catch {}
  }

  await waitForSlot();
  process.stdout.write('fetching Dollard relation 3123125... ');
  const raw = await fetchRelation();
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.elements) || parsed.elements.length === 0)
    throw new Error(`Unexpected response: ${raw.slice(0, 100)}`);
  fs.writeFileSync(FILE, JSON.stringify(parsed, null, 2));
  const rel = parsed.elements[0];
  console.log(`${rel.members.length} members, tags: ${JSON.stringify(rel.tags)}`);
  console.log('Saved to data/overpass/dollard-relation.json');
})();
