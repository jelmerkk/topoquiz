// Topografie Quiz — geografische afstandshelpers (#95)
//
// Alle functies zijn puur: geen DOM, geen Leaflet, geen globals.
// Invoer is altijd {lat, lon} en/of ruwe GeoJSON-coordinaten.
//
//   haversine(lat1, lon1, lat2, lon2)   → km tussen twee punten
//   pointToSegmentDist(lat, lon,        → km tot lijnstuk (lat1,lon1)-(lat2,lon2)
//     lat1, lon1, lat2, lon2)             — gebruikt haversine na lineaire projectie
//   pointInPolygon(lat, lon, coords)    → boolean, ray-casting.
//                                          coords is een ring [[lon, lat], …]
//                                          (GeoJSON-volgorde)
//   distanceToFeatureGeometry(lat, lon, → km van punt tot een GeoJSON-feature
//     feature)                            (Polygon, MultiPolygon, LineString).
//                                          0 als het punt binnen de polygon valt.

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Afstand van punt (lat,lon) tot lijnstuk (lat1,lon1)→(lat2,lon2) in km.
// Projecteert lineair in lat/lon-ruimte; acceptabele benadering op de
// schaal van de quiz (~1000 km), exact bij de eindpunten via haversine.
export function pointToSegmentDist(lat, lon, lat1, lon1, lat2, lon2) {
  const dx = lat2 - lat1, dy = lon2 - lon1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((lat - lat1) * dx + (lon - lon1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return haversine(lat, lon, lat1 + t * dx, lon1 + t * dy);
}

// Point-in-polygon (ray casting) — coords zijn [lon, lat] (GeoJSON-volgorde)
export function pointInPolygon(lat, lon, coords) {
  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const lon1 = coords[i][0], lat1 = coords[i][1];
    const lon2 = coords[j][0], lat2 = coords[j][1];
    if (((lat1 > lat) !== (lat2 > lat)) &&
        (lon < (lon2 - lon1) * (lat - lat1) / (lat2 - lat1) + lon1)) {
      inside = !inside;
    }
  }
  return inside;
}

// Afstand van klikpunt tot een GeoJSON-feature in km.
// Handelt Polygon (met holes), MultiPolygon en LineString.
// Retourneert 0 als het punt binnen de polygon valt en niet in een hole.
export function distanceToFeatureGeometry(lat, lon, feature) {
  const geom = feature.geometry;
  const coords = geom.coordinates;
  if (geom.type === 'MultiPolygon') {
    let minDist = Infinity;
    for (const poly of coords) {
      if (pointInPolygon(lat, lon, poly[0])) return 0;
      for (const ring of poly) {
        for (let i = 0; i < ring.length - 1; i++) {
          const d = pointToSegmentDist(lat, lon, ring[i][1], ring[i][0], ring[i+1][1], ring[i+1][0]);
          if (d < minDist) minDist = d;
        }
      }
    }
    return minDist;
  }
  if (geom.type === 'Polygon') {
    const inOuter = pointInPolygon(lat, lon, coords[0]);
    const inHole  = coords.length > 1 && coords.slice(1).some(hole => pointInPolygon(lat, lon, hole));
    if (inOuter && !inHole) return 0;
    let minDist = Infinity;
    for (const ring of coords) {
      for (let i = 0; i < ring.length - 1; i++) {
        const d = pointToSegmentDist(lat, lon, ring[i][1], ring[i][0], ring[i+1][1], ring[i+1][0]);
        if (d < minDist) minDist = d;
      }
    }
    return minDist;
  }
  if (geom.type === 'LineString') {
    let minDist = Infinity;
    for (let i = 0; i < coords.length - 1; i++) {
      const d = pointToSegmentDist(lat, lon, coords[i][1], coords[i][0], coords[i+1][1], coords[i+1][0]);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }
  return Infinity;
}
