// SPDX-License-Identifier: CC0-1.0
// English-willow cricket bat lying face down: what makes it one is the blade —
// a flat hitting face with thick square edges and a raised spine on the back
// that peaks low down at the sweet spot, then falls away to the toe and up to
// sloping shoulders — joined at the splice to a round cane handle under a
// ribbed rubber grip. Maker's stickers band the back and a toe guard protects
// the bottom. Generic visualization geometry at about real size (a full-size
// "short handle" bat is about 850 mm long and 108 mm wide), millimetres, Z up,
// face on z = 0.
meta({
  name: 'cricket-bat',
  license: 'CC0-1.0',
  title: 'Cricket bat',
  description: "English-willow cricket bat at about real size, lying face down so the back shows: flat face, thick edges, a raised spine peaking at the sweet spot, sloping shoulders, cane handle with a ribbed rubber grip, maker's sticker bands across the back and a toe guard. The handle choice switches short and long handles. Material controls: willow blade, rubber grip, sticker colour, toe guard; kashmirWillow, blackStickers and weathered presets.",
  tags: ['cricket bat', 'bat', 'cricket', 'english willow', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const handle = param('handle', 'short', { choices: ['short', 'long'], label: 'Handle' });
const willowWood = param('willowWood', '#e3cc98', { label: 'Willow blade' });
const rubberGrip = param('rubberGrip', '#303638', { label: 'Rubber grip' });
const sticker = param('sticker', '#1f5aa6', { label: 'Maker stickers' });
const edgeTape = param('edgeTape', '#262828', { label: 'Toe guard' });
presets({
  clubColors: { willowWood: '#bc985d', rubberGrip: '#d04d40' },
  kashmirWillow: { willowWood: '#c9a66b', sticker: '#b8322a' },
  blackStickers: { sticker: '#151617', rubberGrip: '#d9b43d', edgeTape: '#d9b43d' },
  weathered: { willowWood: '#b39a72', rubberGrip: '#4f4f4b', sticker: '#5b6f86', edgeTape: '#4a4844' },
});

const p = assembly('cricket-bat');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Side outline [[x, z], ...] extruded across Y, centred on y = 0.
const side = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
// Cross-section [[y, z], ...] extruded along X from 0 to len.
const along = (pts, len) => extrudePolygon(pts, len).rotateX(90).rotateZ(90);

const BL = 560;                  // blade length, toe to shoulder
const HW = 54;                   // half the blade width (108 mm)
// Blade cross-section: flat face, square edges, ridged back.
const section = [[-HW, 0], [HW, 0], [HW, 34], [HW - 8, 42], [24, 58], [0, 64], [-24, 58], [-HW + 8, 42], [-HW, 34]];
// Spine profile along the length: peaks low at the sweet spot.
const spine = [[0, 0], [BL, 0], [BL, 30], [500, 36], [400, 54], [300, 66], [190, 66], [100, 58], [20, 44], [0, 40]];
// Plan: rounded toe, straight sides, shoulders sloping into the splice.
const plan = [[0, -HW + 10], [4, -HW + 3], [12, -HW], [490, -HW], [522, -44], [548, -24], [BL, -18],
  [BL, 18], [548, 24], [522, 44], [490, HW], [12, HW], [4, HW - 3], [0, HW - 10]];
const bladeFrom = (dz) => along(section.map(([y, z]) => [y, z + dz]), BL)
  .intersect(side(spine.map(([x, z]) => [x, z + dz]), 2 * HW + 20))
  .intersect(extrudePolygon(plan, 120).translate(0, 0, -10));
const X0 = -430;                 // toe position so the bat sits centred
add('blade', bladeFrom(0).translate(X0, 0, 0).color(willowWood));

// Maker's stickers: two thin skins of the back, clipped to bands across the spine.
for (const [i, [x0, x1]] of [[300, 420], [470, 520]].entries()) {
  add(`back-sticker-${i + 1}`, bladeFrom(1.2).intersect(box(x1 - x0, 2 * HW + 10, 40, true).translate((x0 + x1) / 2, 0, 50))
    .translate(X0, 0, 0).color(sticker));
}
// Rubber toe guard wrapped round the bottom of the blade.
add('toe-guard', along(section.map(([y, z]) => [y * 1.03, z * 0.95 + 0.5]), 14).intersect(side(spine.map(([x, z]) => [x, z + 1]), 2 * HW + 20))
  .translate(X0 - 1.5, 0, 0).color(edgeTape));

// Handle: cane shaft spliced into the shoulders, ribbed rubber grip, tapered end.
const HL = handle.value === 'long' ? 330 : 295;
const HZ = 20;                   // handle axis height above the face
const HX0 = X0 + BL - 40;        // splice runs 40 mm into the blade
add('handle', cylinder(HL + 40, 16, 14).rotateY(90).translate(HX0, 0, HZ).color(willowWood));
add('grip', cylinder(HL - 50, 18.2, 14).rotateY(90).translate(HX0 + 80, 0, HZ).color(rubberGrip));
for (let i = 0; i < Math.floor((HL - 70) / 28); i++) {
  add(`grip-rib-${i + 1}`, cylinder(5, 19.4, 14).rotateY(90).translate(HX0 + 92 + i * 28, 0, HZ).color(rubberGrip));
}
add('grip-end', cylinder(10, 17, 14).rotateY(90).translate(HX0 + HL + 30, 0, HZ).color(rubberGrip));
// Splice: the cane's V showing on the back of the shoulders.
add('splice', side([[BL - 70, 0], [BL, 0], [BL, 34], [BL - 70, 38]], 26).translate(X0, 0, 0.6).color(willowWood));

return p.model();
