#!/usr/bin/env node
// Issue #50: wateren voor set 8.2 via Overpass.
//   Nijl         Q3392   → main_stream LineString
//   Congo        Q3503   → main_stream LineString
//   Niger        Q3542   → main_stream LineString
//   Suezkanaal   Q899    → LineString (kanaal, geen side_stream)
//   Victoriameer Q5505   → Polygon (natural=water, relation)
//
// Gebruikt meerdere mirrors omdat overpass-api.de regelmatig "too busy" is
// voor grote relations.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const MIRRORS = [
  { host: 'overpass.openstreetmap.fr', path: '/api/interpreter' },
  { host: 'overpass-api.de',           path: '/api/interpreter' },
  { host: 'overpass.kumi.systems',     path: '/api/interpreter' },
];
const UA = 'topoquiz-data-fetch/1.0 (https://www.topoquiz.com)';

const QUERIES = [
  { out: 'nijl.json',         q: 'relation["wikidata"="Q3392"]["waterway"="river"];out geom qt;' },
  { out: 'congo-rivier.json', q: 'relation["wikidata"="Q3503"]["waterway"="river"];out geom qt;' },
  { out: 'niger.json',        q: 'relation["wikidata"="Q3542"]["waterway"="river"];out geom qt;' },
  { out: 'suezkanaal.json',   q: 'relation["wikidata"="Q899"];out geom qt;' },
  { out: 'victoriameer.json', q: 'relation["wikidata"="Q5505"];out geom qt;' },
];

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
  const failed = [];
  for (const { out, q } of QUERIES) {
    const dst = path.join(__dirname, 'overpass', out);
    if (fs.existsSync(dst) && fs.statSync(dst).size > 500) {
      console.log(`${out.padEnd(22)} (skip, bestaat al)`);
      continue;
    }
    let ok = false;
    for (const m of MIRRORS) {
      process.stdout.write(`${out.padEnd(22)} ${m.host}… `);
      try {
        const r = await fetchOverpass(q, m);
        if (r.status !== 200 || r.body.startsWith('<')) {
          console.log(`HTTP ${r.status}`);
          continue;
        }
        const parsed = JSON.parse(r.body);
        if (!Array.isArray(parsed.elements) || parsed.elements.length === 0) {
          console.log('leeg'); continue;
        }
        fs.writeFileSync(dst, JSON.stringify(parsed, null, 2));
        const rel = parsed.elements.find(e => e.type === 'relation');
        const ways = rel ? rel.members.filter(mm => mm.type === 'way' && mm.geometry) : [];
        console.log(`ok — ${parsed.elements.length} elements, ${ways.length} ways`);
        ok = true;
        break;
      } catch (e) {
        console.log(`error: ${e.message}`);
      }
      // Wachttijd tussen mirrors bij falen — sommige mirrors reageren na rust.
      await new Promise(r => setTimeout(r, 3000));
    }
    if (!ok) { console.error(`  FAIL: ${out}`); failed.push(out); }
    await new Promise(r => setTimeout(r, 1500));
  }
  if (failed.length) {
    console.error(`\n✗ ${failed.length} gefaald: ${failed.join(', ')} — hervat script later`);
    process.exit(1);
  }
  console.log('\n✓ Alle wateren opgehaald');
})();
