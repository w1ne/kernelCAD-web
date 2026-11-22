// SPDX-License-Identifier: CC0-1.0
// Stock hand truck: the two-wheel sack truck used to wheel cartons from the
// stockroom to the shelves. What makes it a hand truck rather than a trolley:
// a tall tubular frame with cross ties that curves back into a looped
// handle with grips, a flat steel toe plate at the foot that slides under
// a stack, axle brackets behind the frame carrying two pneumatic tyres on
// pressed rims, and optionally a stack of taped cartons riding on the plate.
// Generic visualization geometry at about real size (1.3 m tall, 560 mm
// across the wheels), millimetres, Z up, toe plate toward -Y, base on z = 0.

meta({
  name: "stock-hand-truck",
  license: 'CC0-1.0',
  title: "Stock hand truck",
  description: "Two-wheel stockroom hand truck at about real size: tall tubular frame with cross ties curving back into a looped handle with grips, flat steel toe plate with a back flange, axle brackets carrying two pneumatic tyres on pressed rims, and an optional stack of taped cartons on the plate. Material controls: frame paint, toe plate, tyres, grips. safetyRed, depotBlue and bareAlloy presets; load choice.",
  tags: ['hand truck', 'sack truck', 'dolly', 'stock trolley', 'stockroom', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 2500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#c8302c', { label: 'Frame paint' });
const plate = param('plate', '#9aa3a8', { label: 'Toe plate and rims' });
const tyres = param('tyres', '#1d1f21', { label: 'Tyres' });
const grips = param('grips', '#2b2e31', { label: 'Handle grips' });
const load = param('load', 'cartons', { choices: ['cartons', 'empty'], label: 'Load' });

presets({
  safetyRed: { frame: '#c8302c', plate: '#9aa3a8', tyres: '#1d1f21', grips: '#2b2e31' },
  depotBlue: { frame: '#2f5fa8', plate: '#b8bec2', tyres: '#202224', grips: '#f2c230' },
  bareAlloy: { frame: '#c4cbcf', plate: '#8e979c', tyres: '#2a2c2e', grips: '#c8302c' },
});

const p = assembly("stock-hand-truck");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Turned profile [r, z] revolved about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// Toe plate with a back flange and corner gussets.
add("toe-plate", blk(0, -150, 0, 440, 300, 8).color(plate));
add("toe-flange", blk(0, 6, 0, 440, 12, 140).color(plate));
for (const s of [-1, 1]) add(`gusset-${s < 0 ? 'l' : 'r'}`, extrudePolygon([[0, 8], [-70, 8], [0, 120]], 8).rotateX(90).rotateZ(90).translate(s * 180 - 4, 0, 0).color(plate));

// Tubular frame: two uprights, three cross ties, curving back into a loop handle.
const R = 14;
const FY = 22;
const TOP = 1120;
for (const s of [-1, 1]) {
  const tag = s < 0 ? 'l' : 'r';
  add(`upright-${tag}`, rod([s * 190, FY, 60], [s * 190, FY, TOP], R).color(frame));
  add(`handle-rake-${tag}`, rod([s * 190, FY, TOP], [s * 170, FY + 110, TOP + 120], R).color(frame));
  add(`upright-elbow-${tag}`, sphere(R).translate(s * 190, FY, TOP).color(frame));
}
for (const z of [420, 720, 1000]) add(`cross-tie-${z}`, rod([-190, FY, z], [190, FY, z], 10).color(frame));
const LZ = TOP + 120;
add("handle-loop", torus(170, R, 24).rotateX(90).translate(0, FY + 110, LZ).subtract(blk(0, FY + 110, LZ - 200, 400, 40, 200)).color(frame));
for (const s of [-1, 1]) {
  add(`grip-${s < 0 ? 'l' : 'r'}`, rod([s * 172, FY + 110, LZ - 4], [s * 150, FY + 110, LZ + 80], 20, 12).color(grips));
}

// Axle brackets and axle behind the frame.
const AY = 120;
const WR = 150;
const AZ = WR - 2;
for (const s of [-1, 1]) {
  const tag = s < 0 ? 'l' : 'r';
  add(`axle-bracket-${tag}`, extrudePolygon([[FY - 10, 60], [FY - 10, 330], [AY + 30, AZ + 30], [AY + 30, AZ - 30]], 10)
    .rotateX(90).rotateZ(90).translate(s * 200 - 5, 0, 0).color(frame));
}
add("axle", rod([-300, AY, AZ], [300, AY, AZ], 10).color(plate));

// Pneumatic tyres on pressed rims, outboard of the frame.
for (const s of [-1, 1]) {
  const tag = s < 0 ? 'l' : 'r';
  const tyre = turned([[60, -38], [118, -40], [142, -30], [150, -12], [150, 12], [142, 30], [118, 40], [60, 38]]);
  add(`tyre-${tag}`, tyre.rotateY(90).translate(s * 255, AY, AZ).subtract(blk(s * 255, AY, -40, 120, 340, 40)).color(tyres));
  add(`rim-${tag}`, turned([[0, -30], [68, -30], [68, 30], [0, 30]]).rotateY(90).translate(s * 255, AY, AZ).color(plate));
  add(`hub-${tag}`, cylinder(20, 26, 12).rotateY(90).translate(s * 255 + (s < 0 ? -48 : 28), AY, AZ).color(frame));
}

// Optional load: two taped cartons resting on the toe plate against the frame.
if (load.value === 'cartons') {
  const card = '#b8875a';
  const tape = '#d9c49a';
  add("carton-low", blk(0, -150, 8, 400, 290, 300).color(card));
  add("carton-low-tape", blk(0, -150, 306, 70, 292, 3).color(tape));
  add("carton-low-tape-front", blk(0, -296, 220, 70, 3, 89).color(tape));
  add("carton-low-label", blk(-100, -296, 120, 120, 3, 80).color('#f4f1e8'));
  add("carton-high", blk(-10, -140, 308, 360, 260, 260).color('#a87a50'));
  add("carton-high-tape", blk(-10, -140, 566, 60, 262, 3).color(tape));
  add("carton-high-tape-front", blk(-10, -271, 490, 60, 3, 79).color(tape));
}

return p.model();
