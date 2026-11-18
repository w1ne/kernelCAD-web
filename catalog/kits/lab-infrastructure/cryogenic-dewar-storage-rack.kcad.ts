// SPDX-License-Identifier: CC0-1.0
// Floor restraint rack holding liquid-nitrogen sample dewars.
// What makes it a dewar rack rather than a shelf of cans: each dewar is the
// real squat aluminium vacuum flask, a wide body with a rounded shoulder that
// narrows to a slim neck tube, a foam neck plug and a lidded cap, standing on
// its own round roller base, and each one is held by a steel restraint hoop
// with a quick-release latch on a twin-rail frame anchored to the floor.
// Generic visualization geometry at real size (35 L class dewars about 470 mm
// across, rack about 1.8 m wide and 0.9 m tall), millimetres, Z up, front
// facing -Y, floor on z = 0.
meta({
  name: 'cryogenic-dewar-storage-rack',
  license: 'CC0-1.0',
  title: 'Cryogenic dewar storage rack',
  description: 'Floor restraint rack for liquid-nitrogen sample dewars: squat aluminium dewars with rounded shoulder, slim neck tube, foam neck plug and lidded cap, each on a round roller base with casters, held by a steel restraint hoop with quick-release latch on a twin-rail frame with anchored feet. Material controls: dewar aluminium, rack steel, hoop and latch enamel, neck plug foam, caster rubber. Three or two bays; cleanroom and high-visibility presets.',
  tags: ['dewar', 'liquid nitrogen', 'ln2 storage', 'cryogenic', 'dewar rack', 'sample storage', 'laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 2600
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const bays = param('bays', 'three', { choices: ['three', 'two'], label: 'Dewar bays' });
const enamel = param('enamel', '#e0b524', { label: 'Restraint hoop and latch enamel' });
const stainless = param('stainless', '#c4cdd0', { label: 'Dewar aluminium' });
const steel = param('steel', '#3f525a', { label: 'Rack frame steel' });
const foam = param('foam', '#2f6fb0', { label: 'Neck plug foam and cap' });
const rubber = param('rubber', '#262b2e', { label: 'Caster rubber' });
presets({
  cleanroom: { enamel: '#e7f0ed', stainless: '#d0d9d8', steel: '#75888d', foam: '#23a5a2', rubber: '#484f52' },
  highVisibility: { enamel: '#ffd000', stainless: '#9aa9ad', steel: '#22343b', foam: '#ff6a1f', rubber: '#171b1d' },
});

const p = assembly('cryogenic-dewar-storage-rack');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);

const N = bays.value === 'three' ? 3 : 2;
const PITCH = 560;
const XS = Array.from({ length: N }, (_, i) => (i - (N - 1) / 2) * PITCH);
const HALF = (N * PITCH) / 2;
const RAIL_Y = 290;
const HOOP_Z = 520;

// Twin-rail frame behind the dewars, anchored to the floor.
for (const x of [-HALF, HALF]) {
  add(`upright-${x}`, box(50, 50, 900, true).translate(x, RAIL_Y, 450).color(steel));
  add(`anchor-foot-${x}`, box(160, 160, 12, true).translate(x, RAIL_Y - 30, 6).color(steel));
  add(`gusset-${x}`, extrudePolygon([[0, 0], [130, 0], [0, 130]], 10).rotateX(90).rotateZ(-90).translate(x - 5, RAIL_Y - 25, 12).color(steel));
}
for (const z of [HOOP_Z, 820]) {
  add(`rail-${z}`, box(2 * HALF + 50, 40, 60, true).translate(0, RAIL_Y, z).color(steel));
}

XS.forEach((x, i) => {
  // Round roller base with three casters.
  add(`roller-base-${i}`, turned([[0, 50], [250, 50], [250, 80], [230, 92], [0, 92]]).translate(x, 0, 0).color(steel));
  for (let k = 0; k < 3; k += 1) {
    const a = ((k * 120 + 90) * Math.PI) / 180;
    add(`caster-${i}-${k}`, extrudePolygon(circle(28, 8), 28).translate(0, 0, -14).rotateY(90).translate(x + 190 * Math.cos(a), 190 * Math.sin(a), 28).color(rubber));
  }

  // Dewar: wide body, rounded shoulder, slim neck tube, collar, foam plug and cap.
  add(`dewar-body-${i}`, turned([
    [0, 92], [205, 92], [232, 112], [236, 140], [236, 520], [228, 580], [200, 630], [150, 668], [80, 690], [58, 692], [0, 692],
  ]).translate(x, 0, 0).color(stainless));
  add(`dewar-neck-${i}`, turned([[0, 690], [42, 690], [42, 770], [0, 770]]).translate(x, 0, 0).color(stainless));
  add(`neck-collar-${i}`, turned([[0, 760], [54, 760], [54, 782], [0, 782]]).translate(x, 0, 0).color(stainless));
  add(`neck-plug-${i}`, turned([[0, 782], [40, 782], [44, 830], [0, 830]]).translate(x, 0, 0).color(foam));
  add(`cap-${i}`, turned([[0, 826], [62, 826], [62, 846], [48, 862], [0, 862]]).translate(x, 0, 0).color(foam));
  add(`carry-handle-${i}`, box(30, 140, 18, true).translate(x, 0, 700).color(steel));
  add(`label-band-${i}`, turned([[236, 300], [240, 300], [240, 360], [236, 360]]).translate(x, 0, 0).color(foam));

  // Restraint hoop around the dewar, tied back to the rail, with a latch at the front.
  add(`restraint-hoop-${i}`, turned([[240, -16], [262, -16], [262, 16], [240, 16]]).translate(x, 0, HOOP_Z).color(enamel));
  add(`hoop-arm-${i}`, box(40, RAIL_Y - 255, 30, true).translate(x, (RAIL_Y + 255) / 2, HOOP_Z).color(enamel));
  add(`latch-${i}`, box(60, 36, 50, true).translate(x, -262, HOOP_Z).color(enamel));
  add(`latch-lever-${i}`, box(20, 12, 80, true).rotateY(25).translate(x + 18, -284, HOOP_Z - 10).color(steel));
});

return p.model();
