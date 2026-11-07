// SPDX-License-Identifier: CC0-1.0
// Canvas travel duffel. What makes it a duffel rather than a tube: a soft
// barrel body with a flat base, round leather end panels, a full-length zip
// across the top, two webbing straps that wrap right round the body and rise
// into a pair of carry handles joined by a leather wrap, a zipped end pocket,
// leather corner patches and brass D-rings at each end for the detachable
// shoulder strap. Generic visualization geometry at real size (weekender
// about 560 x 290 x 300 mm), millimetres, Z up, base on z = 0, long axis X.
meta({
  name: 'duffel-bag',
  license: 'CC0-1.0',
  title: 'Travel duffel bag',
  description: 'Canvas weekender duffel: soft barrel body with flat base, round leather end panels, full-length top zip, two wrap-around webbing straps rising into carry handles with a leather grip wrap, end pocket, brass D-rings and an optional detachable shoulder strap. Weekender or large size. Material controls: canvas body, leather trim, webbing straps, brass hardware; waxedOlive, navySport and desertTan presets.',
  tags: ['duffel bag', 'weekender', 'holdall', 'gym bag', 'luggage', 'travel', 'canvas', 'low poly'],
  kit: 'travel-gear',
  category: 'prop',
  origin: 'base',
  compat: ['travel', 'gym', 'hotel'],
  triangleBudget: 3000,
});

const size = param('size', 'weekender', { choices: ['weekender', 'large'], label: 'Bag size' });
const shoulderStrap = param('shoulderStrap', 'no', { choices: ['yes', 'no'], label: 'Shoulder strap' });
const canvas = param('canvas', '#55684a', { label: 'Body (canvas)' });
const leather = param('leather', '#8a5530', { label: 'End panels, patches and grip (leather)' });
const webbing = param('webbing', '#2e2b26', { label: 'Straps and zip (webbing)' });
const brass = param('brass', '#c49a45', { label: 'D-rings and zip pull (brass)' });
presets({
  waxedOlive: { canvas: '#4c5a3c', leather: '#6f4224', webbing: '#26241f', brass: '#b8913e' },
  navySport: { canvas: '#24344f', leather: '#c9c2b4', webbing: '#d8d3c8', brass: '#a9b0b5' },
  desertTan: { canvas: '#c2a57a', leather: '#5b3a22', webbing: '#4a3a2a', brass: '#c49a45' },
});

const p = assembly('duffel-bag');
const add = (name, shape) => p.part(name, shape);
const k = size.value === 'large' ? 1.25 : 1;
const L = 560 * k;   // length (X)
const D = 290 * k;   // depth (Y)
const H = 300 * k;   // body height (Z)
const RB = 60 * k;   // base corner radius
const RT = 135 * k;  // top corner radius (makes the barrel crown)

// Barrel cross-section in (y, z): flat base with tight corners, big rounded crown.
const arc = (cy, cz, r, a0, a1, n = 5) => Array.from({ length: n + 1 }, (_, i) => {
  const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
  return [cy + r * Math.cos(a), cz + r * Math.sin(a)];
});
const section = (inset) => {
  const y = D / 2 - inset;
  const rb = Math.max(RB - inset, 4);
  const rt = RT - inset;
  return [
    ...arc(-y + rb, inset + rb, rb, 180, 270, 3), ...arc(y - rb, inset + rb, rb, 270, 360, 3),
    ...arc(y - rt, H - inset - rt, rt, 0, 90, 6), ...arc(-y + rt, H - inset - rt, rt, 90, 180, 6),
  ];
};
// Extrude a (y, z) section along +X from x0 for len.
const alongX = (pts, len, x0) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(x0, 0, 0);

add('body', alongX(section(0), L - 40 * k, -L / 2 + 20 * k).color(canvas));
// Leather end panels with a slightly smaller piped rim.
for (const sx of [-1, 1]) {
  add(`end-panel-${sx}`, alongX(section(6 * k), 20 * k, sx < 0 ? -L / 2 : L / 2 - 20 * k).color(leather));
  add(`end-piping-${sx}`, alongX(section(2 * k), 6 * k, sx < 0 ? -L / 2 + 17 * k : L / 2 - 23 * k).color(webbing));
}
// Base panel in leather.
add('base-panel', extrudeRoundedRect(L - 60 * k, D - 30 * k, RB * 0.6, 5 * k).color(leather));

// Full-length zip on the crown, with a brass pull at one end.
add('zip-track', box(L - 70 * k, 22 * k, 6 * k, true).translate(0, 0, H + 1).color(webbing));
add('zip-teeth', box(L - 80 * k, 6 * k, 8 * k, true).translate(0, 0, H + 2).color(brass));
add('zip-pull', box(14 * k, 10 * k, 40 * k, true).rotateY(-30).translate(L / 2 - 70 * k, -14 * k, H + 6 * k).color(brass));

// Two webbing straps wrapping round the body (a thin band outside the section).
const strapX = [-L * 0.22, L * 0.22];
for (const [i, x] of strapX.entries()) {
  const band = alongX(section(-5 * k), 40 * k, x - 20 * k).subtract(alongX(section(0), 42 * k, x - 21 * k));
  add(`wrap-strap-${i}`, band.intersect(box(60 * k, D + 40 * k, H + 20 * k).translate(x - 30 * k, -D / 2 - 20 * k, 0)).color(webbing));
}
// Carry handles: each rises from a strap pair on one side and leans in so the
// two meet over the zip, where a leather wrap holds them together.
const HR = (strapX[1] - strapX[0]) / 2; // arch spans between the straps
const RISE = 95 * k;                    // grip height above the crown
const LEAN = D * 0.24;                  // handle roots sit this far either side of the zip
const slant = Math.hypot(LEAN, RISE);
const tilt = (Math.atan2(LEAN, RISE) * 180) / Math.PI;
for (const sy of [-1, 1]) {
  const arch = torus(HR, 9 * k, 20).intersect(box(3 * HR, 3 * HR, 2 * HR).translate(-1.5 * HR, 0, -HR)).rotateX(90).scale([1, 1, slant / HR]);
  add(`handle-${sy}`, arch.rotateX(sy * tilt).translate(0, sy * LEAN, H - 25 * k).color(webbing));
}
add('handle-wrap', extrudeRoundedRect(120 * k, 34 * k, 12 * k, 30 * k).translate(0, 0, H - 25 * k + RISE - 14 * k).color(leather));

// Leather corner patches on the front face.
for (const sx of [-1, 1]) add(`corner-patch-${sx}`, box(80 * k, 6 * k, 70 * k, true).translate(sx * (L / 2 - 75 * k), -D / 2 - 1, 45 * k).color(leather));
// Zipped front pocket.
add('front-pocket', extrudeRoundedRect(L * 0.38, H * 0.42, 22 * k, 16 * k, { axis: 'y' }).translate(0, -D / 2 - 14 * k, H * 0.36).color(canvas));
add('front-pocket-zip', box(L * 0.34, 6 * k, 6 * k, true).translate(0, -D / 2 - 15 * k, H * 0.54).color(brass));

// Brass D-rings at both ends and the detachable shoulder strap.
const ringZ = H * 0.72;
for (const sx of [-1, 1]) {
  add(`d-ring-${sx}`, torus(18 * k, 4 * k, 10).rotateY(90).translate(sx * (L / 2 + 6 * k), 0, ringZ).color(brass));
  add(`d-ring-tab-${sx}`, box(14 * k, 40 * k, 50 * k, true).translate(sx * (L / 2 + 2 * k), 0, ringZ - 20 * k).color(leather));
}
if (shoulderStrap.value === 'yes') {
  // Strap lying in a loose arc from one D-ring over the bag to the other.
  const SR = L / 2 + 10 * k;
  const strap = torus(SR, 6 * k, 32).intersect(box(3 * SR, 3 * SR, 2 * SR).translate(-1.5 * SR, 0, -SR)).rotateX(90).scale([1, 1, 0.55]);
  add('shoulder-strap', strap.translate(0, D * 0.42, ringZ).color(webbing));
  add('shoulder-pad', extrudeRoundedRect(150 * k, 50 * k, 18 * k, 14 * k).translate(0, D * 0.42, ringZ + SR * 0.55 - 4 * k).color(leather));
}

return p.model();
