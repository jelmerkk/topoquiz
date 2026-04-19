#!/usr/bin/env node
// Issue #49 (set 8.1): Amazone-river relation via Wikidata Q3783.
// Gebruikt openstreetmap.fr als primaire mirror — overpass-api.de staat
// vaak in de weg voor grote queries.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT = path.join(__dirname, 'overpass', 'amazone.json');
const MIRRORS = [
  { host: 'overpass.openstreetmap.fr', path: '/api/interpreter' },
  { host: 'overpass-api.de',           path: '/api/interpreter' },
  { host: 'overpass.kumi.systems',     path: '/api/interpreter' },
];
const UA = 'topoquiz-data-fetch/1.0 (https://www.topoquiz.com)';

function fetchOverpass(query, mirror) {
  return new Promise((res, rej) => {
    const body = 'data=' + encodeURIComponent('[out:json][timeout:180];' + query);
    const req = https.request({
      hostname: mirror.host, path: mirror.path, method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': UA,
      },
    }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, body: d }));
    });
    req.on('error', rej);
    req.write(body); req.end();
  });
}

(async () => {
  // Wikidata Q3783 = Amazone (rivier).
  const query = 'relation["wikidata"="Q3783"]["waterway"="river"];out geom qt;';
  for (const m of MIRRORS) {
    process.stdout.write(`Fetching Amazone (Q3783) van ${m.host}… `);
    try {
      const r = await fetchOverpass(query, m);
      if (r.status !== 200 || r.body.startsWith('<')) {
        console.log(`HTTP ${r.status} / niet-JSON (${r.body.slice(0,80)})`);
        continue;
      }
      const parsed = JSON.parse(r.body);
      if (!Array.isArray(parsed.elements) || parsed.elements.length === 0) {
        console.log('leeg antwoord');
        continue;
      }
      fs.writeFileSync(OUT, JSON.stringify(parsed, null, 2));
      const rel = parsed.elements.find(e => e.type === 'relation');
      const ways = rel ? rel.members.filter(m => m.type === 'way' && m.geometry) : [];
      console.log(`${parsed.elements.length} elements, ${ways.length} ways → ${path.relative(path.join(__dirname,'..'), OUT)}`);
      return;
    } catch (e) {
      console.log(`error: ${e.message}`);
    }
  }
  console.error('Alle mirrors faalden'); process.exit(1);
})();
