#!/usr/bin/env node
// Haalt data op voor bugfixes #75 (Luxemburg polygoon) en #76 (Belgische Maas)
// Slaat ruwe Overpass-JSON op in data/overpass/

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT_DIR = path.join(__dirname, 'overpass');

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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const QUERIES = [
  {
    name: 'luxembourg-boundary',
    out: 'luxembourg-boundary.json',
    q: 'relation["ISO3166-1"="LU"]["admin_level"="2"];out geom qt;',
  },
  {
    name: 'maas-belgie',
    out: 'maas-belgie.json',
    // Maas heet in Wallonië "Meuse", maar OSM heeft ook "Maas" voor het stuk bij Luik
    q: 'way["waterway"="river"](49.4,4.0,51.2,6.4)[~"^name"~"Maas|Meuse"];out geom qt;',
  },
];

(async () => {
  for (const item of QUERIES) {
    const outPath = path.join(OUT_DIR, item.out);
    process.stdout.write(`Fetching ${item.name}... `);
    try {
      const raw = await fetch(item.q);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.elements)) throw new Error('onverwacht antwoord: ' + raw.slice(0, 100));
      fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2));
      console.log(`${parsed.elements.length} elementen → ${item.out}`);
    } catch (e) {
      console.error(`FOUT: ${e.message}`);
    }
    await sleep(3000);
  }
  console.log('\nDone. Draai nu: node data/process-bugfixes.js');
})();
