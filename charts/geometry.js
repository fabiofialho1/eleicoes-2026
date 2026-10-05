// Geometry helpers on the SVG path strings of charts/brazil-map.js: split a state into two parts whose AREAS match given proportions.
export const ringsOf = (d) => d.split("M").filter(Boolean).map((seg) => seg.replace("Z", "").split("L").map((p) => p.split(" ").map(Number)));
export const ringArea = (r) => Math.abs(r.reduce((s, [x, y], i) => { const [x2, y2] = r[(i + 1) % r.length]; return s + (x * y2 - x2 * y); }, 0)) / 2;
export function clipLeft(ring, cut) { // Sutherland-Hodgman against the half-plane x <= cut
  const out = [];
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    const ain = a[0] <= cut, bin = b[0] <= cut;
    if (ain) out.push(a);
    if (ain !== bin) { const t = (cut - a[0]) / (b[0] - a[0]); out.push([cut, a[1] + t * (b[1] - a[1])]); }
  });
  return out;
}
export function centroidSide(d, cut, side) { // area-weighted centroid of the part left (side -1) or right (side 1) of x = cut
  let A = 0, X = 0, Y = 0;
  ringsOf(d).forEach((ring) => {
    const part = side < 0 ? clipLeft(ring, cut) : clipLeft(ring.map(([x, y]) => [-x, y]), -cut).map(([x, y]) => [-x, y]);
    if (part.length < 3) return;
    let a2 = 0, cx = 0, cy = 0;
    part.forEach(([x, y], i) => { const [x2, y2] = part[(i + 1) % part.length]; const c = x * y2 - x2 * y; a2 += c; cx += (x + x2) * c; cy += (y + y2) * c; });
    if (!a2) return;
    A += Math.abs(a2); X += (cx / (3 * a2)) * Math.abs(a2); Y += (cy / (3 * a2)) * Math.abs(a2);
  });
  return A ? { x: X / A, y: Y / A } : null;
}
export function splitCut(d, frac) { // x position where the area to the left is `frac` of the state's area
  const rings = ringsOf(d);
  const total = rings.reduce((s, r) => s + ringArea(r), 0);
  const xs = rings.flat().map((p) => p[0]);
  let lo = Math.min(...xs), hi = Math.max(...xs);
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    const left = rings.reduce((s, r) => { const c = clipLeft(r, mid); return s + (c.length > 2 ? ringArea(c) : 0); }, 0);
    if (left < frac * total) lo = mid; else hi = mid;
  }
  return { cut: (lo + hi) / 2, minX: Math.min(...xs), maxX: Math.max(...xs) };
}
