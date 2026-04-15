#!/usr/bin/env node
// Natural Earth admin_0_map_units — land-only polygonen voor UK-constituents.
// OSM admin_level=4 bevat maritieme zones tot 12 nmi offshore, waardoor
// Schotland zonder filter één grote ring vormt die vasteland + Shetland
// omsluit (artefact-brug over zee). Filteren op maritime=yes werkt niet
// omdat de relatie de coastline-ways niet als members heeft.
//
// Natural Earth (MIT, 1:50m) heeft UK-constituents als separate features
// met echte coastline-geometry. Precies wat een quiz-kaart nodig heeft.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_map_units.geojson';
const OUT = path.join(__dirname, 'overpass', 'ne-uk-map-units.json');

// NAME (kort) voor het map_units bestand: NE spelt Northern Ireland als "N. Ireland".
// Ierland hoort als admin_0 map_unit (Sovereign country) ook in deze file.
const WANTED = new Set(['England', 'Scotland', 'Wales', 'N. Ireland', 'Ireland']);

// Mapping NE-naam → NL-naam voor gewesten.geojson
const NL_NAMES = {
  'England':     'Engeland',
  'Scotland':    'Schotland',
  'Wales':       'Wales',
  'N. Ireland':  'Noord-Ierland',
  'Ireland':     'Ierland',
};

https.get(URL, res => {
  if (res.statusCode !== 200) { console.error('HTTP', res.statusCode); process.exit(1); }
  let buf = '';
  res.setEncoding('utf8');
  res.on('data', c => { buf += c; });
  res.on('end', () => {
    const data = JSON.parse(buf);
    const filtered = {
      type: 'FeatureCollection',
      features: data.features.filter(f => WANTED.has(f.properties.NAME)),
    };
    console.log(`Filtered ${filtered.features.length}/${data.features.length} features:`);
    for (const f of filtered.features) {
      const g = f.geometry;
      const rings = g.type === 'MultiPolygon' ? g.coordinates.length : 1;
      const pts = g.type === 'MultiPolygon'
        ? g.coordinates.reduce((s, p) => s + p[0].length, 0)
        : g.coordinates[0].length;
      console.log(`  ${f.properties.NAME}: ${g.type} (${rings} ring${rings>1?'en':''}, ${pts} pts)`);
    }
    fs.writeFileSync(OUT, JSON.stringify(filtered));
    console.log(`→ ${OUT}`);
  });
}).on('error', e => { console.error(e); process.exit(1); });
