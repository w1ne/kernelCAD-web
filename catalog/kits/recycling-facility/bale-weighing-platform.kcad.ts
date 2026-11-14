// SPDX-License-Identifier: CC0-1.0
// Bale weighing platform: the low floor scale every finished bale crosses
// so the yard knows what it is shipping. What makes it that scale rather
// than a plate: a checker-plate deck sitting on four load cells inside a
// recessed steel frame, drive-on ramps at both ends for the forklift,
// bump-guard bollards at the corners, a cable to a pedestal indicator with
// a big red readout and ticket printer, and a strapped bale on the deck.
// Generic visualization geometry at about real size (2 m x 4.4 m deck with
// ramps, 1.7 m indicator), millimetres, Z up, indicator faces -Y.

meta({
  name: "bale-weighing-platform",
  license: 'CC0-1.0',
  title: "Bale weighing platform",
  description: "Forklift bale floor scale at about real size: checker-plate deck on four load cells in a steel frame, drive-on ramps at both ends, corner bump-guard bollards, cable to a pedestal weight indicator with red readout and ticket printer, and a strapped bale on the deck. Material controls: deck, frame, indicator and safety trim; cardboard, paper, plastic or no bale. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "weighing platform", "floor scale", "bale scale", "load cell", "weight indicator", "bale", "forklift", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const deck = param('deck', '#8c9396', { label: 'Checker-plate deck' });
const frame = param('frame', '#2f5d9a', { label: 'Scale frame and ramps (paint)' });
const indicator = param('indicator', '#e3e5e1', { label: 'Indicator housing' });
const trim = param('trim', '#f0b429', { label: 'Bollards and safety trim' });
const bale = param('bale', 'cardboard', { choices: ['cardboard', 'paper', 'plastic', 'none'], label: 'Bale on deck' });

presets({
  plant: { deck: '#8c9396', frame: '#2f5d9a', indicator: '#e3e5e1', trim: '#f0b429' },
  weathered: { deck: '#6e6a62', frame: '#4d5660', indicator: '#bfbcb2', trim: '#a8893f' },
  stainless: { deck: '#c6cbcd', frame: '#9aa2a4', indicator: '#dfe3e4', trim: '#2f5d9a' },
  highVisibility: { deck: '#7d8487', frame: '#d9692a', indicator: '#f4f4f0', trim: '#f2d21b' },
});

const p = assembly("bale-weighing-platform");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) side profile extruded along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 2000, L = 2500, H = 110; // deck width (x), length (y), top height

// Frame, deck and checker pattern.
add("frame", blk(0, 0, 0, W + 160, L + 160, H - 20).color(frame));
add("deck", blk(0, 0, H - 30, W, L, 30).color(deck));
for (let i = 0; i < 9; i++) for (let j = 0; j < 11; j++) {
  if ((i + j) % 2) continue;
  add(`tread-${i}-${j}`, blk(-W / 2 + 120 + i * 220, -L / 2 + 130 + j * 224, H, 110, 30, 6).color(deck));
}
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  add(`load-cell-${sx}-${sy}`, blk(sx * (W / 2 + 140), sy * (L / 2 - 250), 0, 120, 260, 70).color('#c6cbcd'));
  add(`cell-foot-${sx}-${sy}`, cylinder(20, 70, 10).translate(sx * (W / 2 + 140), sy * (L / 2 - 250), 70).color('#5a6266'));
}

// Drive-on ramps at both ends.
for (const s of [-1, 1]) {
  add(`ramp-${s}`, profileYZ(s < 0 ? [[-L / 2 - 80, 0], [-L / 2 - 80, H - 10], [-L / 2 - 1000, 0]] : [[L / 2 + 80, 0], [L / 2 + 1000, 0], [L / 2 + 80, H - 10]], W).color(frame));
  add(`ramp-edge-${s}`, blk(0, s * (L / 2 + 120), H - 30, W, 80, 22).color(trim));
}

// Bump-guard bollards with black bands at the four corners.
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const x = sx * (W / 2 + 450), y = sy * (L / 2 - 100);
  add(`bollard-${sx}-${sy}`, cylinder(1000, 70, 12).translate(x, y, 0).color(trim));
  add(`bollard-band-${sx}-${sy}`, cylinder(120, 72, 12).translate(x, y, 700).color('#1f2224'));
  add(`bollard-cap-${sx}-${sy}`, sphere(70).translate(x, y, 1000).color(trim));
}

// Junction box and cable to a pedestal indicator on -X/-Y.
const IX = -W / 2 - 1100, IY = -L / 2 - 300;
add("junction-box", blk(-W / 2 - 160, -L / 2 + 300, 0, 120, 220, 160).color('#5a6266'));
add("cable", cylinder(-W / 2 - 160 - IX, 15, 6).rotateY(-90).translate(-W / 2 - 160, -L / 2 + 300, 25).color('#1f2224'));
add("cable-run", cylinder(-L / 2 + 300 - IY, 15, 6).rotateX(90).translate(IX, -L / 2 + 300, 25).color('#1f2224'));
add("pedestal-base", blk(IX, IY, 0, 400, 400, 30).color('#5a6266'));
add("pedestal", cylinder(1200, 45, 10).translate(IX, IY, 30).color(indicator));
add("indicator", blk(IX, IY, 1200, 520, 160, 360).color(indicator));
add("display", blk(IX, IY - 82, 1360, 400, 8, 120).color('#2a0d0d'));
for (let k = 0; k < 5; k++) add(`digit-${k}`, blk(IX - 150 + k * 75, IY - 88, 1385, 50, 6, 70).color('#ff3b2f'));
for (let k = 0; k < 4; k++) add(`key-${k}`, blk(IX - 150 + k * 100, IY - 82, 1250, 70, 10, 50).color('#5a6266'));
add("printer", blk(IX, IY + 40, 1560, 300, 200, 120).color(indicator));
add("ticket", blk(IX, IY - 60, 1650, 160, 4, 90).color('#fbfaf3'));

// Strapped bale on the deck.
if (bale.value !== 'none') {
  const baleColor = bale.value === 'paper' ? '#e2ddcf' : bale.value === 'plastic' ? '#5c8fc4' : '#b88a55';
  add("bale", blk(0, 0, H + 6, 1100, 1500, 1100).color(baleColor));
  for (const y of [-550, -180, 180, 550]) add(`bale-wire-${y}`, blk(0, y, H + 3, 1106, 14, 1106).color('#4a4f52'));
}

return p.model();
