// SPDX-License-Identifier: CC0-1.0
// Bale accumulator: the "flat 8" sledge towed behind a small square baler that
// collects bales into a block of eight and drops the block for a grab to pick
// up. What makes it one rather than a box: a sloping inlet chute hitched to
// the baler's bale chamber, a low flat bed of slats and a hydraulic side
// pusher sliding bales across, rear tilting tines that release the pack,
// side guide rails, two flotation wheels on stub axles and the straw bales
// themselves with their two twine bands. Generic visualization geometry at
// real size (small bales 360 x 460 x 900 mm, bed about 2.4 m square),
// millimetres, Z up, towed towards +Y, parking stand on z = 0.
meta({
  name: "bale-accumulator",
  license: 'CC0-1.0',
  title: "Bale accumulator",
  description: "Flat-8 small square bale accumulator at real size: sloping inlet chute and drawbar to the baler, slatted bed with a hydraulic side pusher, rear tilting release tines, side guide rails, two flotation wheels and parking stand, carrying straw bales with twine bands. Bale count choice empty, half or full pack. Material controls: frame paint, straw, tyres and twine/steel; harvestRed, blueYard and weathered presets.",
  tags: ['bale accumulator', 'flat 8', 'small square bales', 'hay', 'straw', 'baler', 'farm machinery', 'agriculture', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 4000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const load = param('load', 'half pack', { choices: ['empty', 'half pack', 'full pack'], label: 'Bales on the bed' });
const framePaint = param('framePaint', '#3d7a3a', { label: 'Frame paint' });
const straw = param('straw', '#d9bd6a', { label: 'Straw bales' });
const tyreRubber = param('tyreRubber', '#262a2b', { label: 'Tyres' });
const steelTwine = param('steelTwine', '#9aa3a6', { label: 'Tines, rims and twine' });
presets({
  harvestRed: { framePaint: '#b52a22' },
  blueYard: { framePaint: '#2c5b9a', steelTwine: '#c8cdd0' },
  weathered: { framePaint: '#56684c', straw: '#b19a5e', steelTwine: '#7b8180' },
});

const p = assembly('bale-accumulator');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Plate across X (thickness t, centred on x = 0) from a side profile in [y, z] points.
const sidePlate = (pts, t) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);
// Tube from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const ring = Array.from({ length: n }, (_, i) => [r * Math.cos(((i + 0.5) / n) * Math.PI * 2), r * Math.sin(((i + 0.5) / n) * Math.PI * 2)]);
  return extrudePolygon(ring, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const BW = 2400;                    // bed width
const BD = 1900;                    // bed depth (along Y)
const ZB = 420;                     // bed top
const WR = 330;                     // wheel radius

// Bed: frame rails, cross slats and the side pusher plate.
for (const s of [-1, 1]) add(`bed-rail-${s < 0 ? 'left' : 'right'}`, box(80, BD, 120, true).translate(s * (BW / 2 - 40), 0, ZB - 60).color(framePaint));
for (const y of [-BD / 2 + 40, BD / 2 - 40]) add(`bed-crossmember-${y < 0 ? 'rear' : 'front'}`, box(BW, 80, 120, true).translate(0, y, ZB - 60).color(framePaint));
for (let i = 0; i < 9; i++) add(`bed-slat-${i}`, box(BW - 160, 90, 20, true).translate(0, -BD / 2 + 150 + i * 200, ZB - 10).color(steelTwine));
add('pusher-plate', box(40, 920, 360, true).translate(BW / 2 - 140, 480, ZB + 180).color(framePaint));
add('pusher-cylinder', rod([BW / 2 - 120, 480, ZB + 200], [BW / 2 + 150, 480, ZB + 200], 45, 8).color(framePaint));
add('pusher-rod', rod([BW / 2 - 300, 480, ZB + 200], [BW / 2 - 120, 480, ZB + 200], 18, 6).color(steelTwine));

// Inlet chute from the baler, sloping down onto the right-hand front corner.
add('inlet-chute', sidePlate([[BD / 2 - 80, ZB], [BD / 2 + 1100, 820], [BD / 2 + 1100, 860], [BD / 2 - 80, ZB + 40]], 520).translate(BW / 2 - 400, 0, 0).color(framePaint));
for (const s of [-1, 1]) add(`chute-side-${s < 0 ? 'in' : 'out'}`, sidePlate([[BD / 2 - 80, ZB + 40], [BD / 2 + 1100, 860], [BD / 2 + 1100, 1000], [BD / 2 - 80, ZB + 200]], 16).translate(BW / 2 - 400 + s * 268, 0, 0).color(framePaint));
add('drawbar', rod([BW / 2 - 400, BD / 2 + 1100, 760], [-200, BD / 2 - 40, ZB - 60], 45, 8).color(framePaint));
add('hitch-eye', rod([BW / 2 - 400, BD / 2 + 1080, 700], [BW / 2 - 400, BD / 2 + 1250, 700], 40, 8).color(steelTwine));

// Side guide rails.
for (const s of [-1, 1]) {
  const k = s < 0 ? 'left' : 'right';
  const x = s * (BW / 2 - 20);
  for (const y of [-BD / 2 + 60, 0, BD / 2 - 60]) add(`guide-post-${k}-${Math.round(y)}`, rod([x, y, ZB], [x, y, ZB + 520], 22, 6).color(framePaint));
  add(`guide-rail-${k}`, rod([x, -BD / 2 + 40, ZB + 520], [x, BD / 2 - 40, ZB + 520], 24, 6).color(framePaint));
}

// Rear release tines, tilted down at the back edge.
for (let i = 0; i < 10; i++) {
  const x = -BW / 2 + 160 + i * ((BW - 320) / 9);
  add(`release-tine-${i}`, rod([x, -BD / 2 + 40, ZB - 40], [x, -BD / 2 - 520, ZB - 230], 18, 6).color(steelTwine));
}
add('tine-tilt-shaft', rod([-BW / 2 + 60, -BD / 2 + 40, ZB - 40], [BW / 2 - 60, -BD / 2 + 40, ZB - 40], 40, 8).color(framePaint));

// Flotation wheels on stub axles, and a parking stand under the drawbar.
for (const s of [-1, 1]) {
  const k = s < 0 ? 'left' : 'right';
  add(`tyre-${k}`, cylinder(240, WR, 16).rotateY(90).translate(s * (BW / 2 + 60) - 120, 200, WR + 10).color(tyreRubber));
  add(`rim-${k}`, cylinder(250, 190, 12).rotateY(90).translate(s * (BW / 2 + 60) - 125, 200, WR + 10).color(steelTwine));
  add(`stub-axle-${k}`, rod([s * (BW / 2 - 40), 200, WR + 10], [s * (BW / 2 + 200), 200, WR + 10], 35, 8).color(framePaint));
}
add('parking-stand', rod([600, BD / 2 + 400, 640], [600, BD / 2 + 400, 60], 30, 8).color(framePaint));
add('parking-foot', box(180, 180, 60, true).translate(600, BD / 2 + 400, 30).color(framePaint));

// Straw bales on the bed, each with two twine bands.
const BL = 900; const BWd = 460; const BH = 360;
const slots = [];
for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) slots.push([-BW / 2 + 150 + BWd / 2 + c * (BWd + 20), -BD / 2 + 120 + BL / 2 + r * (BL + 20)]);
const count = load.value === 'empty' ? 0 : load.value === 'half pack' ? 5 : 8;
for (let i = 0; i < count; i++) {
  const [x, y] = slots[i];
  add(`bale-${i}`, box(BWd, BL, BH, true).translate(x, y, ZB + BH / 2).color(straw));
  for (const o of [-1, 1]) add(`bale-${i}-twine-${o < 0 ? 'a' : 'b'}`, box(BWd + 8, 14, BH + 8, true).translate(x, y + o * 220, ZB + BH / 2).color(steelTwine));
}

return p.model();
