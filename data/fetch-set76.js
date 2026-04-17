#!/usr/bin/env node
// Haalt Overpass-data op voor set 76: Donau en Po.
// Meren (Genève, Balaton) en Adriatische Zee worden handmatig gedefinieerd
// in process-set76.js — OSM-relaties voor meren/zeeën zijn vaak onvolledig
// of bevatten maritieme artefacten.

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

const QUERIES = [
  // Donau — OSM kent de Donau als "Donau" in AT, maar de super-relation
  // heeft name="Danube" (Engels). Gebruik wikidata-tag voor eenduidigheid.
  {
    name: 'donau',
    out: 'donau.json',
    q: 'relation["wikidata"="Q1653"]["waterway"="river"];out geom qt;',
  },
  // Po — OSM relatie voor de Italiaanse rivier
  {
    name: 'po',
    out: 'po.json',
    q: 'way["name"="Po"]["waterway"="river"](44,6,46,13);out geom qt;',
  },
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
  console.log('\nDone. Draai nu: node data/process-set76.js');
})();
