#!/usr/bin/env node
// Chains + RDP-simplifies coastline ways per dataset.
// Output: data/overpass/processed-coastlines.json

const fs   = require('fs');
const path = require('path');
const DIR  = path.join(__dirname, 'overpass');

function perpendicularDist(p, a, b) {
  const dx = b[0]-a[0], dy = b[1]-a[1];
  if (dx===0 && dy===0) return Math.hypot(p[0]-a[0], p[1]-a[1]);
  const t = ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / (dx*dx+dy*dy);
  return Math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy));
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let maxD = 0, maxI = 0;
  for (let i = 1; i < pts.length-1; i++) {
    const d = perpendicularDist(pts[i], pts[0], pts[pts.length-1]);
    if (d > maxD) { maxD = d; maxI = i; }
  }
  if (maxD > eps) return [...rdp(pts.slice(0, maxI+1), eps).slice(0,-1), ...rdp(pts.slice(maxI), eps)];
  return [pts[0], pts[pts.length-1]];
}
function dist(a, b) { return Math.hypot(a[0]-b[0], a[1]-b[1]); }

function chain(ways) {
  const segs = ways.map(w => w.geometry.map(n => [n.lon, n.lat]));
  if (!segs.length) return [];
  const result = [...segs[0]], used = new Set([0]);
  let progressed = true;
  while (progressed && used.size < segs.length) {
    progressed = false;
    for (const [getRef, prepend] of [
      [() => result[result.length-1], false],
      [() => result[0],               true ],
    ]) {
      const ref = getRef();
      let bi = -1, rev = false, bd = Infinity;
      for (let i = 0; i < segs.length; i++) {
        if (used.has(i)) continue;
        const s = segs[i];
        const d1 = dist(ref, s[0]), d2 = dist(ref, s[s.length-1]);
        if (d1 < bd) { bd = d1; bi = i; rev = false; }
        if (d2 < bd) { bd = d2; bi = i; rev = true;  }
      }
      if (bi !== -1 && bd <= 0.02) {  // tighter gap for coastlines
        const seg = rev ? [...segs[bi]].reverse() : segs[bi];
        if (prepend) result.unshift(...seg.slice(0, -1));
        else         result.push(...seg.slice(1));
        used.add(bi);
        progressed = true;
        break;
      }
    }
  }
  return result;
}

function process(filename, eps = 0.001) {
  const fp = path.join(DIR, filename);
  if (!fs.existsSync(fp)) return null;
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (!raw.elements?.length) return null;
  const chained = chain(raw.elements);
  const simplified = rdp(chained, eps).map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);
  return { raw: raw.elements.length, chained: chained.length, simplified: simplified.length, coords: simplified };
}

const DATASETS = [
  { key: 'coast-zeeland-west',        file: 'coast-zeeland-west.json',         eps: 0.001 },
  { key: 'coast-mainland-waddenzee-w', file: 'coast-mainland-waddenzee-w.json', eps: 0.001 },
  { key: 'coast-mainland-waddenzee-e', file: 'coast-mainland-waddenzee-e.json', eps: 0.001 },
  { key: 'wadden-texel',               file: 'wadden-texel.json',               eps: 0.001 },
  { key: 'wadden-vlieland',            file: 'wadden-vlieland.json',            eps: 0.001 },
  { key: 'wadden-terschelling',        file: 'wadden-terschelling.json',        eps: 0.001 },
  { key: 'wadden-ameland',             file: 'wadden-ameland.json',             eps: 0.001 },
  { key: 'wadden-schiermonnikoog',     file: 'wadden-schiermonnikoog.json',     eps: 0.001 },
  { key: 'coast-oosterschelde',        file: 'coast-oosterschelde.json',        eps: 0.001 },
  { key: 'coast-westerschelde',        file: 'coast-westerschelde.json',        eps: 0.001 },
  { key: 'coast-germany-eems',         file: 'coast-germany-eems.json',         eps: 0.001 },
];

const result = {};
for (const d of DATASETS) {
  const r = process(d.file, d.eps);
  if (!r) { console.log(`✗  ${d.key}: no data`); continue; }
  result[d.key] = r.coords;
  const start = r.coords[0], end = r.coords[r.coords.length-1];
  console.log(`✓  ${d.key}: ${r.raw} ways → ${r.chained} pts → ${r.simplified} pts`);
  console.log(`   start [${start}]  end [${end}]`);
}

fs.writeFileSync(path.join(DIR, 'processed-coastlines.json'), JSON.stringify(result, null, 2));
console.log('\nSaved to data/overpass/processed-coastlines.json');
