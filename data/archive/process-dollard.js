#!/usr/bin/env node
// Chains + RDP-simplifies Dollard relation (OSM 3123125) outer ways.
// Output: data/overpass/dollard-processed.json

const fs   = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'overpass', 'dollard-relation.json');
const OUT  = path.join(__dirname, 'overpass', 'dollard-processed.json');

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
      if (bi !== -1 && bd <= 0.02) {
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

const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const rel = raw.elements[0];

const outerWays = rel.members.filter(m => m.role === 'outer');
console.log(`${outerWays.length} outer ways`);

const chained = chain(outerWays);
console.log(`chained: ${chained.length} pts`);
console.log(`  lon range: ${Math.min(...chained.map(p=>p[0])).toFixed(4)} – ${Math.max(...chained.map(p=>p[0])).toFixed(4)}`);
console.log(`  lat range: ${Math.min(...chained.map(p=>p[1])).toFixed(4)} – ${Math.max(...chained.map(p=>p[1])).toFixed(4)}`);

const simplified = rdp(chained, 0.002).map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);
console.log(`simplified (eps=0.002): ${simplified.length} pts`);

// Verify / force close
const first = simplified[0], last = simplified[simplified.length-1];
const gap = dist(first, last);
if (gap > 0.001) {
  console.log(`  open ring (gap=${gap.toFixed(4)}) — closing`);
  simplified.push(first);
} else {
  console.log(`  ring is closed (gap=${gap.toFixed(6)})`);
}

fs.writeFileSync(OUT, JSON.stringify(simplified, null, 2));
console.log('Saved to data/overpass/dollard-processed.json');
