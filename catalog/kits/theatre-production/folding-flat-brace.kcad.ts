// SPDX-License-Identifier: CC0-1.0
// Folding flat brace: an adjustable wooden stage brace kicked out from the
// back of a flat, hooked into a brace cleat and screwed to the deck.
// What makes it a stage brace rather than a stick: two overlapping hardwood
// rails held by sliding iron clamp collars with thumbscrews (so the length
// adjusts), a forked brace hook at the top caught in a brace cleat on the
// flat's stile, a bent foot iron at the bottom with a stage screw driven
// into the deck, and a sandbag thrown over the foot for good measure. A
// short length of flat (stile, toggle and muslin face) gives it something
// to hold up.
// Generic visualization geometry at about real size (2 m tall, 1.3 m kick),
// millimetres, Z up, flat face toward +X, brace leaning out toward -X,
// standing on z = 0.

meta({
  name: "folding-flat-brace",
  license: 'CC0-1.0',
  title: "Folding flat brace",
  description: "Adjustable wooden stage brace at about real size: two overlapping hardwood rails with two sliding iron clamp collars and thumbscrews, forked brace hook caught in a brace cleat on a short length of flat (stile, toggle, muslin face), bent foot iron with a stage screw into the deck, and a sandbag over the foot. Material controls: brace hardwood, iron hardware, flat timber and muslin, sandbag canvas. houseShow, touring and blackBox presets.",
  tags: ['stage brace', 'adjustable brace', 'flat brace', 'brace cleat', 'stage screw', 'foot iron', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const hardwood = param('hardwood', '#b98a52', { label: 'Brace hardwood' });
const iron = param('iron', '#3a3f44', { label: 'Iron hardware' });
const flat = param('flat', '#d8cdb4', { label: 'Flat timber and muslin' });
const canvas = param('canvas', '#8a7a55', { label: 'Sandbag canvas' });

presets({
  houseShow: { hardwood: '#b98a52', iron: '#3a3f44', flat: '#d8cdb4', canvas: '#8a7a55' },
  touring: { hardwood: '#d2a56a', iron: '#9aa3a8', flat: '#c9b48c', canvas: '#3d5a3a' },
  blackBox: { hardwood: '#3b3229', iron: '#1c1d1f', flat: '#26272a', canvas: '#2e2e2e' },
});

const p = assembly("folding-flat-brace");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const deg = (r: number) => (r * 180) / Math.PI;

// Brace line in the XZ plane from the foot to the hook.
const A: [number, number] = [-1300, 70];
const B: [number, number] = [-40, 1900];
const dx = B[0] - A[0];
const dz = B[1] - A[1];
const LEN = Math.sqrt(dx * dx + dz * dz);
const TILT = deg(Math.atan2(dx, dz));
const ux = dx / LEN;
const uz = dz / LEN;
const at = (t: number): [number, number] => [A[0] + ux * t, A[1] + uz * t];
// Box of section w x d running along the brace from t0 to t1, offset n mm off the brace line.
const along = (t0: number, t1: number, w: number, d: number, y: number, n = 0) => {
  const [cx, cz] = at((t0 + t1) / 2);
  return box(w, d, t1 - t0, true).rotateY(TILT).translate(cx + uz * n, y, cz - ux * n);
};

// Short length of flat: stile, toggle, muslin face, brace cleat.
add("flat-stile", blk(30, 0, 0, 60, 90, 2300).color(flat));
add("flat-toggle", blk(30, 300, 0, 60, 510, 70).translate(0, 0, 1100).color(flat));
add("flat-rail", blk(30, 300, 0, 60, 510, 70).color(flat));
add("flat-face", blk(64, 255, 0, 8, 600, 2300).color(flat));
add("brace-cleat", blk(-10, 0, 1860, 20, 70, 120).subtract(blk(-10, 0, 1910, 30, 24, 60)).color(iron));
for (const z of [1880, 1960]) add(`cleat-screw-${z}`, cylinder(6, 7, 8).rotateY(-90).translate(-20, 0, z).color(iron));

// Two overlapping hardwood rails, side by side in y, sliding past each other.
add("rail-lower", along(60, 1500, 32, 50, -18).color(hardwood));
add("rail-upper", along(900, LEN - 70, 32, 50, 18).color(hardwood));

// Clamp collars with thumbscrews where the rails overlap.
for (const [s, t] of [["low", 980], ["high", 1420]] as [string, number][]) {
  add(`collar-${s}`, along(t - 30, t + 30, 46, 112, 0).color(iron));
  const [cx, cz] = at(t);
  add(`thumbscrew-${s}`, cylinder(40, 7, 8).rotateX(90).translate(cx, -56, cz).color(iron));
  add(`thumbscrew-${s}-wing`, box(70, 8, 16, true).translate(cx, -98, cz).color(iron));
}

// Forked brace hook at the top, caught in the cleat.
add("hook-strap", along(LEN - 160, LEN - 20, 40, 60, 18).color(iron));
add("hook-tongue", blk(B[0] + 20, 18, B[1] - 20, 60, 22, 30).color(iron));
add("hook-tip", blk(B[0] + 40, 18, B[1] - 20, 20, 22, 80).color(iron));
for (const t of [LEN - 140, LEN - 50]) {
  const [cx, cz] = at(t);
  add(`hook-bolt-${Math.round(t)}`, cylinder(64, 8, 8).rotateX(90).translate(cx, 50, cz).color(iron));
}

// Bent foot iron screwed to the deck with a stage screw.
add("foot-strap", along(20, 220, 40, 60, -18).color(iron));
add("foot-plate", blk(A[0] - 60, -18, 0, 200, 90, 10).color(iron));
add("stage-screw", cylinder(110, 12, 10).translate(A[0] - 110, -18, 10).color(iron));
add("stage-screw-handle", cylinder(110, 8, 8).rotateY(90).translate(A[0] - 165, -18, 120).color(iron));
for (const t of [60, 180]) {
  const [cx, cz] = at(t);
  add(`foot-bolt-${t}`, cylinder(64, 8, 8).rotateX(90).translate(cx, 14, cz).color(iron));
}

// Sandbag thrown over the foot, flattened pear with a tied neck.
const bag = path().moveTo(0, 0).lineTo(120, 0).lineTo(150, 60).lineTo(120, 130).lineTo(55, 190).lineTo(0, 200).close().revolve();
add("sandbag", bag.scale([1.25, 0.8, 0.6]).translate(A[0] - 90, -40, 10).color(canvas));
add("sandbag-neck", cylinder(40, 26, 8).translate(A[0] - 90, -40, 128).color(canvas));
add("sandbag-tie", cylinder(14, 30, 8).translate(A[0] - 90, -40, 140).color(iron));
add("sandbag-handle", torus(30, 6, 10).rotateX(90).translate(A[0] - 90, -40, 190).color(iron));

return p.model();
