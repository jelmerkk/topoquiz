#!/usr/bin/env node
// Haalt Overpass-data op voor set 75: alleen Theems.
//
// UK-constituents + Ierland komen uit Natural Earth (zie fetch-set75-ne.js):
// de OSM admin_level=4 relaties bevatten maritieme zones tot 12 nmi offshore
// waardoor Schotland's ring van vasteland naar Shetland loopt — een artefact
// dat niet met filteren op-achteraf op te lossen is omdat de relatie zelf
// coastline-ways niet als members heeft.
//
// Ierse Zee wordt handmatig als polygoon in process-set75.js gedefinieerd
// (OSM-relatie "Irish Sea" bestaat wel maar is een minimale multipolygon
// zonder bruikbare rand — zelfde afweging als Het Kanaal en Middellandse Zee).

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT_DIR = path.join(__dirname, 'overpass');

// Main Overpass raakte overbelast tijdens de 7.4-fetch; kumi.systems is de stabiele
// mirror, maar eist een identificeerbare User-Agent.
const OVERPASS_HOST = 'overpass.kumi.systems';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// kumi.systems kent geen slot-endpoint zoals overpass-api.de; we pauzeren gewoon
// 3s tussen queries zodat één sessie niet te agressief wordt.
async function waitForSlot() { return; }

function fetch(q) {
  return new Promise((res, rej) => {
    const body = 'data=' + encodeURIComponent('[out:json][timeout:180];' + q);
    const req = https.request({
      hostname: OVERPASS_HOST, path: '/api/interpreter', method: 'POST',
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

function hasValidData(file) {
  const fp = path.join(OUT_DIR, file);
  if (!fs.existsSync(fp)) return false;
  try {
    const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
    return Array.isArray(d.elements) && d.elements.length > 0;
  } catch { return false; }
}

const QUERIES = [
  // Theems — OSM heeft "River Thames" als relatie met main_stream role.
  {
    name: 'thames',
    out: 'thames.json',
    q: 'relation["name"="River Thames"]["waterway"="river"];out geom qt;',
  },
];

(async () => {
  for (const item of QUERIES) {
    if (hasValidData(item.out)) {
      const d = JSON.parse(fs.readFileSync(path.join(OUT_DIR, item.out), 'utf8'));
      console.log(`✓ ${item.name} — al aanwezig (${d.elements.length} elementen)`);
      continue;
    }
    await waitForSlot();
    process.stdout.write(`Fetching ${item.name}... `);
    try {
      const raw = await fetch(item.q);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.elements)) throw new Error('onverwacht antwoord: ' + raw.slice(0, 100));
      if (parsed.elements.length === 0) throw new Error('0 elementen — controleer de query');
      fs.writeFileSync(path.join(OUT_DIR, item.out), JSON.stringify(parsed, null, 2));
      console.log(`${parsed.elements.length} elementen → ${item.out}`);
    } catch (e) {
      console.error(`FOUT: ${e.message}`);
    }
    await sleep(3000);
  }
  console.log('\nDone. Draai nu: node data/process-set75.js');
})();
