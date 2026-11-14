// SPDX-License-Identifier: CC0-1.0
// Travel neck pillow. What makes it one rather than a ring: a fat U of
// stuffed fabric that is thickest at the back of the neck and tapers towards
// two rounded front ends, open at the front for the chin, with a contrasting
// piped seam running round its outer edge, a snap strap that can close the
// gap, and a small stuff-sack loop at the back. Generic visualization
// geometry at real size (adult about 300 x 280 x 110 mm), millimetres, Z up,
// lying flat on z = 0, opening facing -Y.
meta({
  name: 'travel-neck-pillow',
  license: 'CC0-1.0',
  title: 'Travel neck pillow',
  description: 'U-shaped travel neck pillow: fat stuffed back tapering to two rounded front ends, open at the chin, contrasting piped outer seam, snap strap across the opening and a stuff-sack loop. Child or adult size, strap open or closed. Material controls: plush fabric, piping, strap webbing, snap button; slateBlue, memoryFoamGrey and sunsetCoral presets.',
  tags: ['travel neck pillow', 'neck rest', 'neck cushion', 'travel', 'comfort', 'airplane', 'low poly'],
  kit: 'travel-gear',
  category: 'prop',
  origin: 'base',
  compat: ['travel', 'airplane', 'train'],
  triangleBudget: 2200,
});

const size = param('size', 'adult', { choices: ['child', 'adult'], label: 'Pillow size' });
const clasp = param('clasp', 'closed', { choices: ['closed', 'open'], label: 'Front strap' });
const plush = param('plush', '#4f7690', { label: 'Pillow cover (plush fabric)' });
const piping = param('piping', '#e7e1d4', { label: 'Seam piping (cord)' });
const strap = param('strap', '#2b3238', { label: 'Front strap (webbing)' });
const snap = param('snap', '#b8bec4', { label: 'Snap button (metal)' });
presets({
  slateBlue: { plush: '#3f5f77', piping: '#d9d3c4', strap: '#1f262c', snap: '#aeb5bb' },
  memoryFoamGrey: { plush: '#7d8084', piping: '#3a3c3f', strap: '#2a2b2d', snap: '#c9ced2' },
  sunsetCoral: { plush: '#e07a5f', piping: '#f4ead4', strap: '#3d405b', snap: '#d8b25a' },
});

const p = assembly('travel-neck-pillow');
const k = size.value === 'child' ? 0.78 : 1;
const RING = 112;     // centre-line radius of the U
const TUBE = 50;      // tube radius at the back
const FLAT = 0.82;    // tubes are a little flatter than round
// Built about the tube centre plane, then lifted so the fattest point rests on z = 0.
const add = (name, shape) => p.part(name, shape.translate(0, 0, TUBE * FLAT).scale(k));
const OPEN = 34;      // half-angle of the chin opening, degrees from -Y

// The U is built from short tapered tube segments swept round the centre line,
// thick at the back (+Y) and thinner towards the front ends.
const SEGS = 14;
const span = 360 - 2 * OPEN;
const at = (t) => {
  const a = ((-90 + OPEN + span * t) * Math.PI) / 180;
  return [RING * Math.cos(a), RING * Math.sin(a)];
};
const radiusAt = (t) => TUBE * (0.74 + 0.26 * Math.sin(Math.PI * t));
for (let i = 0; i < SEGS; i += 1) {
  const t0 = i / SEGS;
  const t1 = (i + 1) / SEGS;
  const [x0, y0] = at(t0);
  const [x1, y1] = at(t1);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
  const r0 = radiusAt(t0);
  const r1 = radiusAt(t1);
  const seg = path().moveTo(0, 0).lineTo(r0, 0).lineTo(r1, len).lineTo(0, len).close().revolve()
    .rotateY(90).scale([1, 1, FLAT]).rotateZ(ang).translate(x0, y0, 0);
  add(`cushion-${i}`, seg.color(plush));
  // Pillow joints: a ball at each joint keeps the tube smooth.
  add(`joint-${i}`, sphere(r0).scale([1, 1, FLAT]).translate(x0, y0, 0).color(plush));
}
const [ex, ey] = at(1);
add('joint-end', sphere(radiusAt(1)).scale([1, 1, FLAT]).translate(ex, ey, 0).color(plush));

// Piped seam round the outer edge at mid-height, following the taper.
const outer = (t) => {
  const [x, y] = at(t);
  const f = (RING + radiusAt(t) - 1) / RING;
  return [x * f, y * f, 0];
};
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
for (let i = 0; i < SEGS; i += 1) add(`piping-${i}`, rod(outer(i / SEGS), outer((i + 1) / SEGS), 4).color(piping));

// Stuff-sack loop at the back.
add('back-loop', torus(16, 4, 8).rotateX(90).translate(0, RING + TUBE * 0.95, 8).color(strap));

// Snap strap across the chin opening.
const [sx, sy] = at(0.02);
const SZ = TUBE * FLAT * 0.55;
for (const side of [-1, 1]) {
  add(`strap-tab-${side}`, box(52, 30, 4, true).rotateZ(side * 18).translate(side * (Math.abs(sx) + 8), sy - 4, SZ).color(strap));
}
if (clasp.value === 'closed') {
  add('strap-bridge', box(2 * Math.abs(sx) - 30, 30, 4, true).translate(0, sy - 12, SZ + 2).color(strap));
}
add('snap-stud', cylinder(5, 7, 12).translate(-Math.abs(sx) + 4, sy - 6, SZ + 2).color(snap));
add('snap-cap', cylinder(5, 7, 12).translate(Math.abs(sx) - 4, sy - 6, SZ + 2).color(snap));

return p.model();
