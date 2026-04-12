#!/usr/bin/env node
// Fetches OSM relations for Oosterschelde (6846427) and Westerschelde (9745220).
// Saves to data/overpass/oosterschelde-relation.json and westerschelde-relation.json.
// Skips if already present. Rate-limit aware.

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const OUT   = path.join(__dirname, 'overpass');

const TARGETS = [
  { name: 'oosterschelde', id: 6846427, file: 'oosterschelde-relation.json' },
  { name: 'westerschelde', id: 9745220, file: 'westerschelde-relation.json' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function checkStatus() {
  return new Promise((res, rej) => {
    https.get('https://overpass-api.de/api/status', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
    }).on('error', rej);
  });
}

async function waitForSlot() {
  while (true) {
    const s = await checkStatus();
    const avail = s.match(/(\d+) slots available now/);
    if (avail && parseInt(avail[1]) > 0) return;
    const m = s.match(/in (\d+) seconds/);
    const wait = m ? (parseInt(m[1]) + 2) * 1000 : 20000;
    console.log(`  rate limited — waiting ${Math.ceil(wait/1000)}s`);
    await sleep(wait);
  }
}

function fetchRelation(id) {
  return new Promise((res, rej) => {
    const body = 'data=' + encodeURIComponent(`[out:json][timeout:120];relation(${id});out geom;`);
    const req = https.request({
      hostname: 'overpass-api.de', path: '/api/interpreter', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)); });
    req.on('error', rej);
    req.write(body); req.end();
  });
}

(async () => {
  for (const t of TARGETS) {
    const fp = path.join(OUT, t.file);
    if (fs.existsSync(fp)) {
      try {
        const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
        if (d.elements?.length > 0) {
          const rel = d.elements[0];
          console.log(`✓ ${t.name} already present (${rel.members.length} members) — skipping`);
          continue;
        }
      } catch {}
    }

    await waitForSlot();
    process.stdout.write(`fetching ${t.name} relation ${t.id}... `);
    const raw = await fetchRelation(t.id);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Unexpected response for ${t.name}: ${raw.slice(0, 100)}`);
    }
    if (!Array.isArray(parsed.elements) || parsed.elements.length === 0)
      throw new Error(`Empty response for ${t.name}: ${raw.slice(0, 100)}`);
    fs.writeFileSync(fp, JSON.stringify(parsed, null, 2));
    const rel = parsed.elements[0];
    const outer = rel.members.filter(m => m.role === 'outer').length;
    const inner = rel.members.filter(m => m.role === 'inner').length;
    console.log(`${rel.members.length} members (${outer} outer, ${inner} inner)`);
    console.log(`  tags: ${JSON.stringify(rel.tags).slice(0, 100)}`);
    console.log(`  Saved to data/overpass/${t.file}`);
    await sleep(5000);
  }
  console.log('\nDone.');
})();
