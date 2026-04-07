#!/usr/bin/env node
// Fetches river geometry from Overpass API with rate-limit awareness.
// Skips files that already have valid data (>1 way).
// Run: node data/fetch-overpass.js

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT_DIR = path.join(__dirname, 'overpass');
fs.mkdirSync(OUT_DIR, { recursive: true });

const RIVERS = [
  { name: 'waal',                 q: 'way["name"="Waal"]["waterway"="river"](51.75,4.8,51.95,6.1);out geom;' },
  { name: 'neder-rijn',           q: 'way["name"="Neder-Rijn"]["waterway"="river"](51.90,5.3,52.05,6.1);out geom;' },
  { name: 'lek',                  q: 'way["name"="Lek"]["waterway"="river"](51.85,4.5,52.05,5.4);out geom;' },
  { name: 'ijssel',               q: 'way["name"="IJssel"]["waterway"="river"](51.90,5.6,52.65,6.3);out geom;' },
  { name: 'maas',                 q: 'way["name"="Maas"]["waterway"="river"](50.7,5.1,51.8,6.3);out geom;' },
  { name: 'bergse-maas',          q: 'way["name"="Bergse Maas"]["waterway"="river"](51.65,4.8,51.80,5.2);out geom;' },
  { name: 'oude-maas',            q: 'way["name"="Oude Maas"]["waterway"="river"](51.78,4.2,51.95,4.8);out geom;' },
  { name: 'nieuwe-waterweg',      q: 'way["name"="Nieuwe Waterweg"](51.85,4.0,52.00,4.5);out geom;' },
  { name: 'noordzeekanaal',       q: 'way["name"="Noordzeekanaal"](52.35,4.5,52.55,5.0);out geom;' },
  { name: 'amsterdam-rijnkanaal', q: 'way["name"="Amsterdam-Rijnkanaal"](51.90,4.85,52.40,5.35);out geom;' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function checkStatus() {
  return new Promise((res, rej) => {
    https.get('https://overpass-api.de/api/status', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
    }).on('error', rej);
  });
}

async function waitForSlot() {
  while (true) {
    const status = await checkStatus();
    const avail = status.match(/(\d+) slots available now/);
    if (avail && parseInt(avail[1]) > 0) return;
    const next = status.match(/Slot available after:.*in (\d+) seconds/);
    const wait = next ? (parseInt(next[1]) + 2) * 1000 : 15000;
    console.log(`  Rate limited — waiting ${Math.ceil(wait/1000)}s...`);
    await sleep(wait);
  }
}

function fetch(q) {
  return new Promise((res, rej) => {
    const body = 'data=' + encodeURIComponent('[out:json][timeout:60];' + q);
    const req = https.request({
      hostname: 'overpass-api.de', path: '/api/interpreter', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)); });
    req.on('error', rej);
    req.write(body); req.end();
  });
}

function hasValidData(name) {
  const fp = path.join(OUT_DIR, name + '.json');
  if (!fs.existsSync(fp)) return false;
  try {
    const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
    return Array.isArray(d.elements) && d.elements.length > 0;
  } catch { return false; }
}

(async () => {
  for (const r of RIVERS) {
    if (hasValidData(r.name)) {
      console.log(`✓ ${r.name} — already have valid data, skipping`);
      continue;
    }
    await waitForSlot();
    process.stdout.write(`Fetching ${r.name}... `);
    try {
      const raw = await fetch(r.q);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.elements)) throw new Error('rate limited or empty: ' + raw.slice(0, 80));
      fs.writeFileSync(path.join(OUT_DIR, r.name + '.json'), JSON.stringify(parsed, null, 2));
      console.log(`${parsed.elements.length} ways`);
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
    await sleep(2000); // courteous pause between requests
  }
  console.log('\nDone. Check data/overpass/ for results.');
})();
