#!/usr/bin/env node
// Haalt Overpass-data op voor set 74 (Duitsland): Rijn, Elbe, Moezel als relaties.
// Relatie-queries hebben role=main_stream metadata → processRiver() filtert side_streams weg,
// wat het zigzag-artefact voorkomt dat je met way-bbox queries zou krijgen.
// Slaat ruwe JSON op in data/overpass/.
// Gebruik: node data/fetch-set74.js  →  node data/process-set74.js

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT_DIR = path.join(__dirname, 'overpass');

// Hoofd-endpoint is overbelast bij grote relation-queries (Rhein, La Moselle).
// kumi.systems is een publieke mirror die snellere responses geeft voor grote relations.
const OVERPASS_HOST = 'overpass.kumi.systems';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetch(q) {
  return new Promise((res, rej) => {
    const body = 'data=' + encodeURIComponent('[out:json][timeout:240];' + q);
    const req = https.request({
      hostname: OVERPASS_HOST, path: '/api/interpreter', method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'topoquiz-data-fetch/1.0 (https://www.topoquiz.com)',
      }
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
  // Rhein — OSM-naam = "Rhein" (Duits). Relation geeft hele loop van bron in CH tot monding NL.
  // We slaan hem op als rhein-duitsland.json (apart van de bestaande NL-segmenten) zodat
  // we later het Duitse deel los kunnen verwerken / clippen.
  {
    name: 'rhein-duitsland',
    out: 'rhein-duitsland.json',
    q: 'relation["name"="Rhein"]["waterway"="river"];out geom qt;',
  },
  // Elbe — OSM-naam "Elbe". Loopt CZ-grens → Noordzee.
  {
    name: 'elbe',
    out: 'elbe.json',
    q: 'relation["name"="Elbe"]["waterway"="river"];out geom qt;',
  },
  // Moezel — OSM-naam is "La Moselle" (Frans). name:de="Mosel", name:nl="Moezel".
  // Zelfde patroon als Loire/Rhône in set 73.
  {
    name: 'mosel',
    out: 'mosel.json',
    q: 'relation["name"="La Moselle"]["waterway"="river"];out geom qt;',
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
  console.log('\nDone. Draai nu: node data/process-set74.js');
})();
