#!/usr/bin/env node
// Haalt Overpass-data op voor set 77: Oder, Weichsel, Dnjepr.
// Oostzee en Zwarte Zee → handmatige polygonen in process-set77.js
// (OSM-relaties voor zeeën zijn vaak onvolledig, en op kinderniveau is een
// vereenvoudigde contour voldoende — vgl. Adriatische Zee in set 76).

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT_DIR = path.join(__dirname, 'overpass');
const OVERPASS_HOST = 'overpass.kumi.systems';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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

// Wikidata IDs voor de super-relations (stabielere sleutel dan name=).
//   Oder/Odra     → Q552   (Duitsland–Polen grens)
//   Wisła/Weichsel → Q548   (Polen)
//   Dnjepr/Dnipro → Q40855 (Rusland–Wit-Rusland–Oekraïne)
const QUERIES = [
  { name: 'oder',     out: 'oder.json',     q: 'relation["wikidata"="Q552"]["waterway"="river"];out geom qt;' },
  { name: 'weichsel', out: 'weichsel.json', q: 'relation["wikidata"="Q548"]["waterway"="river"];out geom qt;' },
  { name: 'dnjepr',   out: 'dnjepr.json',   q: 'relation["wikidata"="Q40855"]["waterway"="river"];out geom qt;' },
];

(async () => {
  for (const item of QUERIES) {
    if (hasValidData(item.out)) {
      const d = JSON.parse(fs.readFileSync(path.join(OUT_DIR, item.out), 'utf8'));
      console.log(`✓ ${item.name} — al aanwezig (${d.elements.length} elementen)`);
      continue;
    }
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
  console.log('\nDone. Draai nu: node data/process-set77.js');
})();
