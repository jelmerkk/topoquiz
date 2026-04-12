#!/usr/bin/env node
// Retry script for failed rivers with alternative OSM queries

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const OUT_DIR = path.join(__dirname, 'overpass');

const RETRY = [
  // Neder-Rijn: try without waterway filter, broader bbox
  { name: 'neder-rijn',  q: 'way["name"="Neder-Rijn"](51.88,5.2,52.10,6.1);out geom;' },
  // Lek: broader bbox
  { name: 'lek',         q: 'way["name"="Lek"]["waterway"="river"](51.82,4.4,52.10,5.5);out geom;' },
  // Maas: split into two smaller bboxes (south + north)
  { name: 'maas-south',  q: 'way["name"="Maas"]["waterway"="river"](50.7,5.5,51.3,6.3);out geom;' },
  { name: 'maas-north',  q: 'way["name"="Maas"]["waterway"="river"](51.3,5.1,51.8,6.2);out geom;' },
  // Bergse Maas: broader + no waterway filter
  { name: 'bergse-maas', q: 'way["name"="Bergse Maas"](51.60,4.7,51.85,5.3);out geom;' },
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
    const next = status.match(/in (\d+) seconds/);
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

(async () => {
  for (const r of RETRY) {
    await waitForSlot();
    process.stdout.write(`Fetching ${r.name}... `);
    try {
      const raw = await fetch(r.q);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.elements)) throw new Error('not JSON/rate limit');
      fs.writeFileSync(path.join(OUT_DIR, r.name + '.json'), JSON.stringify(parsed, null, 2));
      console.log(`${parsed.elements.length} ways`);
    } catch (e) { console.log(`ERROR: ${e.message.slice(0,60)}`); }
    await sleep(3000);
  }
  console.log('Done');
})();
