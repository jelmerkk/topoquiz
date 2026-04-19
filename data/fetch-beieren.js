#!/usr/bin/env node
// Issue #81: haal Bayern (Beieren) op als admin-boundary relation.
// Wikidata Q980 — taalonafhankelijk, omzeilt meertalige name-tags.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT = path.join(__dirname, 'overpass', 'beieren-boundary.json');
const HOST = 'overpass-api.de';
const UA   = 'topoquiz-data-fetch/1.0 (https://www.topoquiz.com)';

function fetchOverpass(query) {
  return new Promise((res, rej) => {
    const body = 'data=' + encodeURIComponent('[out:json][timeout:90];' + query);
    const req = https.request({
      hostname: HOST, path: '/api/interpreter', method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': UA,
      },
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)); });
    req.on('error', rej);
    req.write(body); req.end();
  });
}

(async () => {
  // Wikidata Q980 = Freistaat Bayern, admin_level=4
  const query = 'relation["wikidata"="Q980"]["boundary"="administrative"];out geom qt;';
  process.stdout.write(`Fetching Bayern (Q980)… `);
  const raw = await fetchOverpass(query);
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) { console.error('Geen JSON:', raw.slice(0, 200)); process.exit(1); }
  if (!Array.isArray(parsed.elements) || parsed.elements.length === 0) {
    console.error('Leeg antwoord:', raw.slice(0, 200)); process.exit(1);
  }
  fs.writeFileSync(OUT, JSON.stringify(parsed, null, 2));
  const rel = parsed.elements.find(e => e.type === 'relation');
  const outerWays = rel ? rel.members.filter(m => m.type === 'way' && m.role !== 'inner') : [];
  console.log(`${parsed.elements.length} elementen, ${outerWays.length} outer ways → ${path.relative(path.join(__dirname,'..'), OUT)}`);
})();
