#!/usr/bin/env node
// Fetches Rhine (Rhein) geometry south of Wesel from Overpass API.
// Saves to data/overpass/rhein-wesel-koeln.json

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT_DIR = path.join(__dirname, 'overpass');
fs.mkdirSync(OUT_DIR, { recursive: true });

const RIVERS = [
  // Rhine from Köln to Wesel (German section below Wesel)
  { name: 'rhein-koeln-wesel',  q: 'way["name"="Rhein"]["waterway"="river"](50.85,6.55,51.70,6.82);out geom;' },
  // Rhine from Koblenz to Köln (Mittelrhein enters flat section)
  { name: 'rhein-koblenz-koeln', q: 'way["name"="Rhein"]["waterway"="river"](50.35,6.55,50.95,7.65);out geom;' },
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
      if (!Array.isArray(parsed.elements)) throw new Error('not JSON/rate limit: ' + raw.slice(0, 80));
      fs.writeFileSync(path.join(OUT_DIR, r.name + '.json'), JSON.stringify(parsed, null, 2));
      console.log(`${parsed.elements.length} ways`);
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
    await sleep(3000);
  }
  console.log('Done. Check data/overpass/ for results.');
})();
