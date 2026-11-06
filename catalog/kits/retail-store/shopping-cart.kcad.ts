// SPDX-License-Identifier: CC0-1.0
// Supermarket shopping cart (trolley).
// What makes it a shopping cart rather than a wire box on wheels: the basket is
// tapered (narrower and lower at the nose, so carts nest), its front overhangs
// the chassis, the rear wall is a hinged gate with a fold-down child seat, the
// push handle sits above and behind the basket on two raked brackets, and the
// chassis is a nesting U with a lower tray between two front swivel casters and
// two rear fixed wheels.
// Generic visualization geometry at real size (about 560 mm wide, 960 mm long,
// 1.03 m to the handle), millimetres, Z up, nose towards -Y, floor on z = 0.
meta({
  name: 'shopping-cart',
  license: 'CC0-1.0',
  title: 'Shopping cart',
  description: 'Supermarket shopping cart: tapered wire basket that overhangs the nose so carts nest, hinged rear gate with fold-down child seat or plain gate, raked handle brackets with a plastic push bar, nesting U chassis with lower tray, two swivel and two fixed casters. Material controls: basket wire, chassis tube, handle and seat plastic, caster rubber. Clean-store and night-restock presets.',
  tags: ['shopping cart', 'shopping trolley', 'grocery cart', 'supermarket', 'retail', 'grocery', 'shop', 'low poly', 'scene prop', 'CC0'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const childSeat = param('childSeat', 'seat', { choices: ['seat', 'none'], label: 'Rear gate' });
const stainless = param('stainless', '#a9b4b8', { label: 'Basket wire (zinc-plated steel)' });
const chassis = param('chassis', '#5b666b', { label: 'Chassis tube (powder-coated steel)' });
const polypropylene = param('polypropylene', '#c8372f', { label: 'Handle and seat plastic' });
const rubber = param('rubber', '#25292c', { label: 'Caster rubber' });

presets({
  cleanStore: {
    stainless: '#d3dadd',
    chassis: '#8f9ba0',
    polypropylene: '#2f8a52',
    rubber: '#40474b',
  },
  nightRestock: {
    stainless: '#6c7a80',
    chassis: '#2f383d',
    polypropylene: '#45614e',
    rubber: '#1f2326',
  },
});

const p = assembly('shopping-cart');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turn a +Z-pointing shape to point along `d`, then move it to `at`.
const orient = (shape, d, at) => {
  const len = Math.hypot(d[0], d[1], d[2]);
  return shape
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(at[0], at[1], at[2]);
};
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0, p1, r, n = 4) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  return orient(extrudePolygon(circle(r, n), Math.hypot(d[0], d[1], d[2])), d, p0);
};
const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// Basket: top rim and floor corners. Front (nose) is narrower and lower and
// overhangs the chassis; the rim rises slightly towards the handle.
const RIM = { fl: [-275, -500, 905], fr: [275, -500, 905], rl: [-280, 330, 935], rr: [280, 330, 935] };
const FLOOR = { fl: [-215, -405, 640], fr: [215, -405, 640], rl: [-235, 310, 655], rr: [235, 310, 655] };
const W = 5;

// Rim and floor loops, plus two intermediate horizontal rings.
for (const [tag, u] of [['floor', 0], ['ring-1', 0.36], ['ring-2', 0.7], ['rim', 1]]) {
  const c = {};
  for (const k of ['fl', 'fr', 'rl', 'rr']) c[k] = lerp(FLOOR[k], RIM[k], u);
  const r = tag === 'rim' ? 9 : W;
  add(`${tag}-front`, rod(c.fl, c.fr, r).color(stainless));
  add(`${tag}-rear`, rod(c.rl, c.rr, r).color(stainless));
  add(`${tag}-left`, rod(c.fl, c.rl, r).color(stainless));
  add(`${tag}-right`, rod(c.fr, c.rr, r).color(stainless));
}
// Side wires, front wires and the floor grid.
for (let i = 1; i < 8; i += 1) {
  const u = i / 8;
  add(`left-wire-${i}`, rod(lerp(FLOOR.fl, FLOOR.rl, u), lerp(RIM.fl, RIM.rl, u), W).color(stainless));
  add(`right-wire-${i}`, rod(lerp(FLOOR.fr, FLOOR.rr, u), lerp(RIM.fr, RIM.rr, u), W).color(stainless));
}
for (let i = 1; i < 6; i += 1) {
  const u = i / 6;
  add(`front-wire-${i}`, rod(lerp(FLOOR.fl, FLOOR.fr, u), lerp(RIM.fl, RIM.fr, u), W).color(stainless));
  add(`floor-wire-${i}`, rod(lerp(FLOOR.fl, FLOOR.fr, u), lerp(FLOOR.rl, FLOOR.rr, u), W).color(stainless));
}
// Corner posts of the basket.
for (const k of ['fl', 'fr', 'rl', 'rr']) add(`corner-${k}`, rod(FLOOR[k], RIM[k], 8).color(stainless));
// Plastic nose bumpers on the two front rim corners.
add('bumper-left', rod(lerp(RIM.fl, RIM.fr, -0.02), lerp(RIM.fl, RIM.fr, 0.14), 20, 8).color(polypropylene));
add('bumper-right', rod(lerp(RIM.fl, RIM.fr, 0.86), lerp(RIM.fl, RIM.fr, 1.02), 20, 8).color(polypropylene));

// Rear gate: hinged from the rim, vertical wires; with the seat option a
// plastic child-seat flap folded down inside the basket and leg openings.
for (let i = 1; i < 6; i += 1) {
  const u = i / 6;
  add(`gate-wire-${i}`, rod(lerp(FLOOR.rl, FLOOR.rr, u), lerp(RIM.rl, RIM.rr, u), W).color(stainless));
}
if (childSeat.value === 'seat') {
  const seatW = 380;
  const seat = extrudePolygon([[0, 0], [seatW, 0], [seatW, 230], [0, 230]], 14)
    .rotateX(-112)
    .translate(-seatW / 2, 318, 915);
  add('child-seat-flap', seat.color(polypropylene));
  add('child-seat-hinge', rod([-seatW / 2, 322, 918], [seatW / 2, 322, 918], 13, 8).color(polypropylene));
}

// Handle: two raked brackets from the rear rim up and back to the push bar.
const H = [0, 430, 1015];
for (const s of [-1, 1]) {
  const rim = s < 0 ? RIM.rl : RIM.rr;
  add(`handle-bracket-${s}`, rod(rim, [s * 265, H[1] - 10, H[2] - 20], 12, 6).color(chassis));
  add(`handle-cap-${s}`, rod([s * 265, H[1], H[2]], [s * 290, H[1], H[2]], 22, 10).color(polypropylene));
}
add('push-bar', rod([-265, H[1], H[2]], [265, H[1], H[2]], 19, 10).color(polypropylene));

// Chassis: nesting U base frame, rear legs up to the basket, lower tray.
const CF = 175;
const fl = [-200, -360, CF];
const fr = [200, -360, CF];
const rl = [-245, 300, CF];
const rr = [245, 300, CF];
add('chassis-left', rod(fl, rl, 14, 8).color(chassis));
add('chassis-right', rod(fr, rr, 14, 8).color(chassis));
add('chassis-front', rod(fl, fr, 14, 8).color(chassis));
for (const s of [-1, 1]) {
  const base = s < 0 ? rl : rr;
  add(`rear-leg-${s}`, rod(base, [s * 240, 315, 655], 14, 8).color(chassis));
  add(`front-strut-${s}`, rod([s * 200, -360, CF], [s * 215, -300, 640], 11, 6).color(chassis));
}
for (let i = 0; i < 6; i += 1) {
  const y = -300 + i * 105;
  add(`tray-wire-${i}`, rod([-205, y, 235], [205, y, 235], W).color(stainless));
}
add('tray-left', rod([-215, -320, 235], [-215, 270, 235], 8).color(stainless));
add('tray-right', rod([215, -320, 235], [215, 270, 235], 8).color(stainless));
for (const s of [-1, 1]) add(`tray-hanger-${s}`, rod([s * 205, -320, CF], [s * 215, -320, 235], 6).color(chassis));

// Casters: two swivel at the nose, two fixed at the rear.
const R = 62;
for (const [tag, x, y] of [['fl', -200, -360], ['fr', 200, -360], ['rl', -245, 300], ['rr', 245, 300]]) {
  add(`caster-plate-${tag}`, box(70, 70, 10, true).translate(x, y, CF - 14).color(chassis));
  add(`caster-swivel-${tag}`, turned([[0, 0], [22, 0], [22, 18], [0, 18]]).translate(x, y, CF - 37).color(chassis));
  for (const s of [-1, 1]) add(`caster-fork-${tag}-${s}`, box(5, 34, 84, true).translate(x + s * 22, y, CF - 72).color(chassis));
  add(`caster-wheel-${tag}`, turned([[0, -15], [R - 10, -15], [R, -9], [R, 9], [R - 10, 15], [0, 15]]).rotateY(90).translate(x, y, R).color(rubber));
  add(`caster-hub-${tag}`, rod([x - 19, y, R], [x + 19, y, R], 22, 8).color(polypropylene));
}

return p.model();
