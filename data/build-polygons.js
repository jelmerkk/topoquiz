#!/usr/bin/env node
// Builds corrected water polygons from processed coastline chains.
// Writes to data/overpass/built-polygons.json for inspection.

const fs = require('fs');
const path = require('path');

const chains = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'overpass/processed-coastlines.json'), 'utf8'
));

const existing = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../wateren.geojson'), 'utf8'
));
const get = name => existing.features.find(f => f.properties.name === name).geometry.coordinates[0];

// ── helpers ────────────────────────────────────────────────────────────
const close = coords => [...coords, coords[0]];
const rev   = coords => [...coords].reverse();

// ── 1. OOSTERSCHELDE ────────────────────────────────────────────────────
// Chain perfectly traces inner shores. Close with straight line across kering.
// start [3.8392,51.7582] (N, Schouwen) → end [3.7207,51.426] (Z, Walcheren)
const oosterschelde = close([
  ...chains['coast-oosterschelde'],
  // close straight across the Oosterscheldekering opening
]);
// It's already nearly closed — start & end are on opposite sides of the kering
// just connect end back to start via the kering-line (just close directly)

// ── 2. WESTERSCHELDE ────────────────────────────────────────────────────
// Chain: [4.0874,51.3807] (E, near Antwerp) → [3.2263,51.3447] (W, sea mouth)
// Close: from sea mouth straight east, staying south of the estuary
const westerschelde = close([
  ...chains['coast-westerschelde'],
  // west → open sea west point → close back to east end
  [3.35, 51.37],  // sea mouth, slightly south
  [3.5,  51.36],
  [3.7,  51.35],
  [4.0,  51.34],
]);

// ── 3. EEMS ─────────────────────────────────────────────────────────────
// NL side: from coast-mainland-waddenzee-e, only the Groningen/Dollard part
// German side: coast-germany-eems [7.1731,53.2405] → [6.9482,53.3267]
// Existing Eems polygon for reference
const eemsCurrent = get('Eems');

// mainland-e: [6.9312,53.3322] → [6.8836,53.4358]  (Delfzijl area → Eems mouth)
// germany-eems: [7.1731,53.2405] → [6.9482,53.3267]
// Chain: NL coast going from Delfzijl NE to Eems mouth, then German coast back
const mainlandE  = chains['coast-mainland-waddenzee-e']; // [6.9312,53.3322]→[6.8836,53.4358]
const germanyE   = chains['coast-germany-eems'];          // [7.1731,53.2405]→[6.9482,53.3267]

// NL side runs from [6.9312,53.3322] to [6.8836,53.4358] — that's Delfzijl to Knock (Eems mouth NL)
// German side runs from [7.1731,53.2405] to [6.9482,53.3267] — Emden area going NW
// Connect: NL end [6.8836,53.4358] → sea → German start [7.1731,53.2405]
// and: German end [6.9482,53.3267] → close back to NL start [6.9312,53.3322]
const eems = close([
  ...mainlandE,                    // NL coast [6.9312,53.3322]→[6.8836,53.4358]
  [6.95, 53.47],                   // sea / Eems mouth north
  [7.10, 53.44],
  [7.20, 53.38],
  ...rev(germanyE),                // German coast reversed: [6.9482,53.3267]→[7.1731,53.2405]
  [6.94, 53.30],                   // bridge back to NL start
]);

// ── 4. WADDENZEE ────────────────────────────────────────────────────────
// mainland-w goes too far south (to 52.47°N = IJsselmeer area)
// Filter to lat >= 52.92 to get only the actual Frisian coast
const mainlandW_full = chains['coast-mainland-waddenzee-w'];
const mainlandW = mainlandW_full.filter(p => p[1] >= 52.92);
console.log('mainland-w after filter:', mainlandW.length, 'pts (was', mainlandW_full.length, ')');
console.log('  start:', mainlandW[0], '→ end:', mainlandW[mainlandW.length-1]);

// Wadden islands - ordered W to E, use full chains (closed rings already)
// For Waddenzee polygon we only need the south-facing coast
// Terschelling + Ameland are already closed rings — filter south-facing portion (lat <= island max lat - a bit)
// Vlieland: [5.13,53.2995]→[5.1405,53.3013] — small open chain (south coast only, already!)
// schiermonnikoog: [6.2185,53.4844]→[6.366,53.5089] — need south portion

// For now use full island chains as outer boundary segments
// The Waddenzee polygon: mainland (S) + gaps bridged to each island + island south coast (N)
// This is complex; use a simplified approach: mainland + open water closures at islands
const waddenzee = close([
  ...mainlandW,                    // Frisian mainland coast W→E (~Den Helder to Harlingen area)
  ...mainlandE,                    // Groningen mainland coast
  [6.88, 53.44],                   // connect to Eems/Dollard boundary
  [6.50, 53.50],                   // north: sea above Schiermonnikoog
  ...rev(chains['wadden-schiermonnikoog']),
  [6.10, 53.52],
  [5.90, 53.53],
  ...rev(chains['wadden-ameland']),
  [5.55, 53.50],
  ...rev(chains['wadden-terschelling']),
  [5.10, 53.40],
  ...rev(chains['wadden-vlieland']),
  [4.90, 53.30],
  ...rev(chains['wadden-texel']),
  [4.75, 52.97],                   // back to Den Helder area
]);

// ── 5. NOORDZEE SW-hoek fix ─────────────────────────────────────────────
// Keep existing polygon but replace bottom points with actual Walcheren coast
// Existing start: [3.37,51.37] going up coast. Replace first 3 pts with coast-zeeland-west
const noordzeeCurrent = get('Noordzee');
// coast-zeeland-west: [3.7044,51.4782]→[3.7207,51.426]  (south end = Vlissingen, north = Domburg)
// Insert after sea-closure section, before the Holland coast
// Find index where coast starts (lon > 3.5 and lat < 52)
const coastStart = noordzeeCurrent.findIndex(p => p[0] > 3.45 && p[1] < 52 && p[1] > 51.5);
console.log('Noordzee coast start index:', coastStart, noordzeeCurrent[coastStart]);
// Replace points [0..coastStart] with the Zeeland coast
const zeelandCoast = rev(chains['coast-zeeland-west']); // reversed: north→south = [3.7044,51.4782]→[3.7207,51.426]
const noordzee = close([
  ...noordzeeCurrent.slice(coastStart),  // from existing coast-start northward + sea closure
  ...zeelandCoast,                        // Walcheren coast south
  [3.37, 51.37],                          // close to sea mouth near Westerschelde
]);

// ── Output ──────────────────────────────────────────────────────────────
const result = { oosterschelde, westerschelde, eems, waddenzee, noordzee };
for (const [k, v] of Object.entries(result)) {
  console.log(`${k}: ${v.length} pts`);
}
fs.writeFileSync(
  path.join(__dirname, 'overpass/built-polygons.json'),
  JSON.stringify(result, null, 2)
);
console.log('\nSaved to data/overpass/built-polygons.json');
