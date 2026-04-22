// Topografie Quiz — spline smoothing (#95)
//
// Catmull-Rom spline voor LineString-coördinaten, zodat rivieren en kanalen
// niet hoekig zijn wanneer Leaflet ze rendert. Pure functies, geen deps.
//
//   smoothLine(coords, numPerSeg)  → nieuwe array [[lon,lat], …] met
//                                     numPerSeg tussenpunten per segment
//   smoothGeoJSON(data)            → geojson met alle LineString-features
//                                     geïnterpoleerd (6 punten per segment)

export function smoothLine(coords, numPerSeg) {
  if (coords.length < 3) return coords;
  // Dupliceer eindpunten zodat de spline netjes door de originele start/eind loopt.
  const pts = [coords[0], ...coords, coords[coords.length - 1]];
  const out = [];
  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2];
    for (let t = 0; t < numPerSeg; t++) {
      const s = t / numPerSeg;
      const s2 = s * s, s3 = s2 * s;
      const x = 0.5 * ((2*p1[0]) + (-p0[0]+p2[0])*s + (2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*s2 + (-p0[0]+3*p1[0]-3*p2[0]+p3[0])*s3);
      const y = 0.5 * ((2*p1[1]) + (-p0[1]+p2[1])*s + (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*s2 + (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*s3);
      out.push([x, y]);
    }
  }
  out.push(coords[coords.length - 1]);
  return out;
}

export function smoothGeoJSON(data) {
  return { ...data, features: data.features.map(f => {
    if (f.geometry.type !== 'LineString') return f;
    return { ...f, geometry: { ...f.geometry, coordinates: smoothLine(f.geometry.coordinates, 6) }};
  })};
}
