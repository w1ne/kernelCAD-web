// SPDX-License-Identifier: CC0-1.0
// Car-park cart corral (trolley return bay).
// What makes it a cart corral rather than a fence: a long narrow lane of
// galvanized tube rails at cart-basket and chassis height on bolted posts, a
// rounded closed end (the top and mid rails bend through a half loop), an
// open entry whose rails flare outward with rubber bumper sleeves so carts
// funnel in, and a tall "return carts here" sign facing the entry.
// Generic visualization geometry at real size (about 1.3 m wide at the mouth,
// 3.9 m long with four bays, 2.1 m to the top of the sign), millimetres, Z up,
// entry towards -X, ground on z = 0.
meta({
  name: 'trolley-corral',
  license: 'CC0-1.0',
  title: 'Trolley corral',
  description: 'Car-park cart corral: long lane of galvanized tube rails on bolted posts, rounded closed end, flared entry with rubber bumper sleeves and a tall return-carts sign facing the mouth; four-bay or two-bay length. Material controls: galvanized steel, powder-coated sign frame and caps, rubber, sign face. Clean-store and night-restock presets.',
  tags: ['cart corral', 'trolley bay', 'cart return', 'trolley shelter', 'car park', 'parking lot', 'retail', 'grocery', 'shop', 'low poly', 'scene prop', 'CC0'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'parking', 'street', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const bays = param('bays', 'four', { choices: ['four', 'two'], label: 'Corral length' });
const galvanizedSteel = param('galvanizedSteel', '#8d999c', { label: 'Galvanized steel rails and posts' });
const powderCoat = param('powderCoat', '#e0a828', { label: 'Sign frame and post caps (powder coat)' });
const rubber = param('rubber', '#2b3033', { label: 'Bumper sleeves and base pads (rubber)' });
const signFace = param('signFace', '#1f5aa6', { label: 'Sign face' });

presets({
  cleanStore: {
    galvanizedSteel: '#c3cccd',
    powderCoat: '#e5ebed',
    rubber: '#40474b',
    signFace: '#2f8a52',
  },
  nightRestock: {
    galvanizedSteel: '#5c6a6e',
    powderCoat: '#354750',
    rubber: '#1f2326',
    signFace: '#8a2f2b',
  },
});

const p = assembly('trolley-corral');
const add = (name, shape) => p.part(name, shape.scale(scale));

const orient = (shape, d, at) => {
  const len = Math.hypot(d[0], d[1], d[2]);
  return shape
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(at[0], at[1], at[2]);
};
const circle = (r, n, cx = 0, cy = 0) =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  return orient(extrudePolygon(circle(r, n), Math.hypot(d[0], d[1], d[2])), d, p0);
};
const turned = (pts, angleDeg) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return angleDeg ? pb.close().revolve({ angleDeg }) : pb.close().revolve();
};

const HALF = 430;
const BAY = 900;
const n = bays.value === 'four' ? 4 : 2;
const X0 = 0;
const X1 = n * BAY;
const RAILS = [[160, 22], [560, 24], [960, 24]];
const TUBE = 24;

// Bolted posts with base plates and domed caps along both sides.
const post = (tag, x, y, h) => {
  add(`${tag}-plate`, box(150, 150, 10, true).translate(x, y, 5).color(galvanizedSteel));
  add(`${tag}-pad`, box(170, 170, 4, true).translate(x, y, 2).color(rubber));
  add(`${tag}-tube`, rod([x, y, 10], [x, y, 10 + h], 30, 10).color(galvanizedSteel));
  add(`${tag}-cap`, turned([[0, 0], [34, 0], [34, 10], [22, 26], [0, 30]]).translate(x, y, 10 + h).color(powderCoat));
};
for (let i = 0; i <= n; i += 1) {
  for (const s of [-1, 1]) post(`post-${i}-${s}`, X0 + i * BAY, s * HALF, 960);
}

// Long side rails at chassis, basket and top height.
for (const [z, r] of RAILS) {
  for (const s of [-1, 1]) add(`rail-${z}-${s}`, rod([X0, s * HALF, z], [X1, s * HALF, z], r).color(galvanizedSteel));
}

// Closed end: the basket and top rails bend through a half loop.
for (const [z] of RAILS.slice(1)) {
  const loop = turned(circle(TUBE, 8, HALF, 0), 180).rotateZ(-90).translate(X1, 0, z);
  add(`end-loop-${z}`, loop.color(galvanizedSteel));
}
add('end-post', turned([[0, 0], [30, 0], [30, 960], [0, 960]]).translate(X1 + HALF, 0, 10).color(galvanizedSteel));
add('end-bumper', box(60, 520, 220, true).translate(X1 + HALF - 40, 0, 250).color(rubber));

// Flared entry: rails splay outwards to two bumper posts.
const MOUTH = [X0 - 480, HALF + 220];
for (const s of [-1, 1]) {
  for (const [z, r] of RAILS.slice(1)) {
    add(`flare-${z}-${s}`, rod([X0, s * HALF, z], [MOUTH[0], s * MOUTH[1], z], r).color(galvanizedSteel));
  }
  post(`mouth-post-${s}`, MOUTH[0], s * MOUTH[1], 960);
  add(`bumper-sleeve-${s}`, turned([[0, 0], [52, 0], [52, 520], [0, 520]]).translate(MOUTH[0], s * MOUTH[1], 280).color(rubber));
}

// Tall sign on twin posts behind the closed end, facing the entry.
const SX = X1 + HALF + 160;
for (const s of [-1, 1]) {
  add(`sign-post-${s}`, turned([[0, 0], [32, 0], [32, 2000], [0, 2000]]).translate(SX, s * 330, 0).color(galvanizedSteel));
}
add('sign-frame', box(50, 820, 560, true).translate(SX - 10, 0, 1800).color(powderCoat));
add('sign-face', box(8, 760, 500, true).translate(SX - 38, 0, 1800).color(signFace));
// Sign graphic: a cart pictogram (basket, handle, wheels) and a lettering band.
const g = SX - 46;
const pictogram = (pts) => extrudePolygon(pts, 4).rotateX(90).rotateZ(90).translate(g, 0, 0);
add('sign-band', box(4, 640, 70, true).translate(g + 2, 0, 1640).color(powderCoat));
add('sign-cart', pictogram([[-150, 1790], [110, 1790], [150, 1920], [-190, 1920]]).color(powderCoat));
add('sign-cart-handle', pictogram([[150, 1905], [250, 1960], [240, 1980], [140, 1925]]).color(powderCoat));
for (const y of [-110, 80]) add(`sign-wheel-${y}`, rod([g, y, 1758], [g + 4, y, 1758], 24).color(powderCoat));

return p.model();
