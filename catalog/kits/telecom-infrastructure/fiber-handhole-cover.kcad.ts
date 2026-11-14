// SPDX-License-Identifier: CC0-1.0
// Fiber handhole cover: the grade-level lid of an underground fibre access box,
// the kind seen in verges and footpaths along a fibre route.
// What makes it a fibre handhole rather than a slab: a polymer-concrete lid
// sitting flush in a rim frame inside a chamfered concrete collar, a raised
// diamond anti-slip tread over the whole lid, two recessed lift slots, two
// pentahead security bolts, a cast-in tier rating plate, an orange
// "FIBER OPTIC" identification placard, and an orange route marker post
// standing at the corner of the collar.
// Generic visualization geometry at real size (860 x 560 mm lid), millimetres,
// Z up, ground on z = 0.

meta({
  name: "fiber-handhole-cover",
  license: 'CC0-1.0',
  title: "Fiber handhole cover",
  description: "Grade-level fibre handhole: polymer-concrete lid flush in a rim frame inside a chamfered concrete collar, raised diamond anti-slip tread, two recessed lift slots, two pentahead security bolts, tier rating plate, orange fibre-optic identification placard and an optional orange route marker post. Material controls: polymer-concrete lid and rim, concrete collar, galvanized hardware, marker orange, dark polymer. Field-site and high-visibility presets.",
  tags: ['handhole', 'fiber handhole', 'pull box', 'access cover', 'utility lid', 'fibre route', 'telecom', 'network', 'communications', 'infrastructure', 'low poly', 'scene prop', 'CC0'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const markerPost = param('markerPost', 'fitted', { choices: ['fitted', 'none'], label: 'Route marker post' });

const polymerConcrete = param('polymerConcrete', '#77746d', { label: 'Lid and rim frame (polymer concrete)' });
const concrete = param('concrete', '#c0bbb0', { label: 'Collar (cast concrete)' });
const galvanizedSteel = param('galvanizedSteel', '#8a979c', { label: 'Bolts and rating plate (galvanized steel)' });
const marker = param('marker', '#f0761a', { label: 'Fibre identification placard and marker post' });
const polymer = param('polymer', '#22292d', { label: 'Lift slots and lettering (dark polymer)' });
presets({
  fieldSite: {
    polymerConcrete: '#6d6a60',
    concrete: '#a8a497',
    galvanizedSteel: '#8f9b9b',
    marker: '#e0691b',
    polymer: '#263a37',
  },
  highVisibility: {
    polymerConcrete: '#4e5357',
    concrete: '#d6d2c8',
    galvanizedSteel: '#3a4b51',
    marker: '#ff8a1c',
    polymer: '#27363c',
  },
});

const p = assembly("fiber-handhole-cover");
const add = (name, shape) => p.part(name, shape.scale(scale));
const b = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z + h / 2);
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);

const LW = 860;
const LD = 560;
const ZC = 100; // collar top
const ZL = 114; // lid top

// Chamfered concrete collar: a square-edged base with a lofted chamfer band
// on top.
const rect = (w, d) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
add('collar-base', b(0, 0, 0, 1300, 1000, 60).color(concrete));
add('collar-chamfer', rect(1300, 1000).loft([rect(1220, 920)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, ZC - 60] },
  ],
  ruled: true,
}).translate(0, 0, 60).color(concrete));

// Rim frame round the lid.
add('rim-front', b(0, -LD / 2 - 20, ZC - 20, LW + 80, 40, 32).color(polymerConcrete));
add('rim-back', b(0, LD / 2 + 20, ZC - 20, LW + 80, 40, 32).color(polymerConcrete));
add('rim-left', b(-LW / 2 - 20, 0, ZC - 20, 40, LD, 32).color(polymerConcrete));
add('rim-right', b(LW / 2 + 20, 0, ZC - 20, 40, LD, 32).color(polymerConcrete));

// Lid with two recessed lift slots, dark at the bottom.
const slots = [-310, 310];
let lid = box(LW - 6, LD - 6, 30, true).translate(0, 0, ZL - 15);
for (const x of slots) lid = lid.subtract(box(110, 30, 24, true).translate(x, 0, ZL));
add('lid', lid.color(polymerConcrete));
for (const x of slots) {
  add(`slot-floor-${x}`, b(x, 0, ZL - 13, 106, 26, 2).color(polymer));
}

// Raised diamond tread, leaving clear the placard, slots and bolts.
for (let i = 0; i < 11; i += 1) {
  for (let j = 0; j < 7; j += 1) {
    const x = -350 + i * 70;
    const y = -210 + j * 70;
    if (Math.abs(x) < 190 && Math.abs(y) < 110) continue;
    if (Math.abs(Math.abs(x) - 310) < 80 && Math.abs(y) < 50) continue;
    if (Math.abs(x) > 330 && Math.abs(y) > 190) continue;
    add(`tread-${i}-${j}`, box(30, 30, 4, true).rotateZ(45).translate(x, y, ZL + 2).color(polymerConcrete));
  }
}

// Fibre identification placard with two bars of lettering.
add('placard', b(0, 0, ZL, 300, 140, 4).color(marker));
add('lettering-top', b(0, 30, ZL + 4, 230, 26, 2).color(polymer));
add('lettering-bottom', b(0, -30, ZL + 4, 180, 26, 2).color(polymer));

// Pentahead security bolts in two corners, and a rating plate.
for (const [x, y] of [[-LW / 2 + 50, -LD / 2 + 50], [LW / 2 - 50, LD / 2 - 50]]) {
  add(`bolt-washer-${x}`, extrudePolygon(circle(28, 12), 3).translate(x, y, ZL).color(galvanizedSteel));
  add(`bolt-head-${x}`, extrudePolygon(circle(17, 5), 12).translate(x, y, ZL + 3).color(galvanizedSteel));
}
add('rating-plate', b(LW / 2 - 70, -LD / 2 + 45, ZL, 90, 40, 3).color(galvanizedSteel));

// Route marker post at the collar corner: flat fibreglass post with a warning
// band and a dome cap.
if (markerPost.value === 'fitted') {
  const [mx, my] = [690, 420];
  add('post-footing', b(mx, my, 0, 180, 180, 40).color(concrete));
  add('post', b(mx, my, 40, 100, 30, 1100).color(marker));
  add('post-band', b(mx, my, 760, 104, 34, 220).color(polymer));
  add('post-decal', b(mx, my - 18, 790, 80, 2, 160).color(galvanizedSteel));
  add('post-cap', path().moveTo(0, 0).lineTo(60, 0).lineTo(55, 20).lineTo(30, 45).lineTo(0, 52).close().revolve()
    .scale([1, 0.4, 1]).translate(mx, my, 1140).color(marker));
}

return p.model();
