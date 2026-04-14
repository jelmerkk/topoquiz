#!/usr/bin/env node
// Haalt Overpass-data op voor set 73: gebieden + rivieren van FR/ES/PT
// Slaat ruwe JSON op in data/overpass/
// Gebruikt dezelfde rate-limit aanpak als fetch-overpass.js

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT_DIR = path.join(__dirname, 'overpass');

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
    const body = 'data=' + encodeURIComponent('[out:json][timeout:90];' + q);
    const req = https.request({
      hostname: 'overpass-api.de', path: '/api/interpreter', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
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
  // Rivieren
  {
    name: 'seine',
    out: 'seine.json',
    // Seine als ways — bbox dekt bron (47.8°N,4.7°E) t/m monding Le Havre (49.5°N,0.1°E)
    q: 'way["name"="La Seine"]["waterway"="river"](47.0,-0.5,50.0,5.5);out geom qt;',
  },
  {
    name: 'loire',
    out: 'loire.json',
    // Loire als relatie — geeft role=main_stream, voorkomt dubbellijn-artefact van de way-query
    // (bij ways-query pakt hij ook side_stream kanaal-aftakkingen, die parallel aan de hoofdstroom lopen)
    q: 'relation["name"="La Loire"]["waterway"="river"];out geom qt;',
  },
  {
    name: 'rhone',
    out: 'rhone.json',
    // Rhône als relatie — bevat hoofd- en zijstromen in de juiste volgorde
    q: 'relation["name"="Le Rhône"]["waterway"="river"];out geom qt;',
  },
  {
    name: 'tajo',
    out: 'tajo.json',
    // Taag (Tejo/Tajo) — OSM-naam is "Río Tajo" (name:nl=Taag, name:pt=Rio Tejo)
    q: 'relation["name"="Río Tajo"]["waterway"="river"];out geom qt;',
  },
  // Andorra als admin-grens (land met admin_level=2)
  {
    name: 'andorra',
    out: 'andorra.json',
    q: 'relation["name"="Andorra"]["admin_level"="2"]["boundary"="administrative"];out geom qt;',
  },
  // Gebieden (administratieve relaties)
  {
    name: 'bretagne',
    out: 'bretagne.json',
    q: 'relation["name"="Bretagne"]["admin_level"="4"]["boundary"="administrative"];out geom qt;',
  },
  {
    name: 'normandie',
    out: 'normandie.json',
    q: 'relation["name"="Normandie"]["admin_level"="4"]["boundary"="administrative"];out geom qt;',
  },
  {
    name: 'corsica',
    out: 'corsica.json',
    // Corse = OSM-naam voor Corsica (admin_level 4)
    q: 'relation["name"="Corse"]["admin_level"="4"]["boundary"="administrative"];out geom qt;',
  },
  {
    name: 'mallorca',
    out: 'mallorca.json',
    // Illes Balears (Balearen) — bevat Mallorca, Menorca, Ibiza
    q: 'relation["name"="Illes Balears"]["admin_level"="4"]["boundary"="administrative"];out geom qt;',
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
    await sleep(2000);
  }
  console.log('\nDone. Draai nu: node data/process-set73.js');
})();
