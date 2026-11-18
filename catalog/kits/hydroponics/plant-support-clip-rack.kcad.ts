// SPDX-License-Identifier: CC0-1.0
// Plant support clip rack: the freestanding pegboard at the end of a
// greenhouse row where growers keep the hardware for training vine crops
// (tomato, cucumber, pepper) up their strings.
// What makes it a clip rack: a steel frame on splayed feet holding a
// perforated board, rows of pegs loaded with bundles of round truss and
// stem clips, a row of rollerhooks (wire hook plus twine spool) hanging
// ready to go up the crop wire, and a bin of loose clips on a shelf below.
// Generic visualization geometry at about real size (0.9 m wide, 1.5 m
// tall), millimetres, Z up, front -Y.

meta({
  name: "plant-support-clip-rack",
  license: 'CC0-1.0',
  title: "Plant support clip rack",
  description: "Freestanding greenhouse pegboard for crop-training hardware at about real size: steel frame on splayed feet, perforated board, pegs loaded with bundles of round truss and stem clips, a row of rollerhooks with twine spools, and a shelf bin of loose clips. Material controls: frame steel, board, clips and twine, plus rollerhook row (on or off). greenhouse, weathered and highVisibility presets.",
  tags: ['plant clips', 'truss clips', 'rollerhook', 'twine', 'crop training', 'pegboard', 'greenhouse', 'hydroponics', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 5600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frameSteel', '#4f6d63', { label: 'Frame and pegs (powder-coated steel)' });
const board = param('board', '#e9e6dc', { label: 'Perforated board (HDPE)' });
const clips = param('clipPolymer', '#3f9a4a', { label: 'Truss and stem clips (polymer)' });
const twine = param('twine', '#d8c79a', { label: 'Rollerhook twine (polypropylene)' });
const hooks = param('rollerhooks', 'on', { choices: ['on', 'off'], label: 'Rollerhook row' });

presets({
  greenhouse: { frameSteel: '#4f6d63', board: '#e9e6dc', clipPolymer: '#3f9a4a', twine: '#d8c79a' },
  weathered: { frameSteel: '#5d625e', board: '#c9c3b2', clipPolymer: '#6f8c58', twine: '#b5a57d' },
  highVisibility: { frameSteel: '#e87832', board: '#f6f4ec', clipPolymer: '#f2c84b', twine: '#ffffff' },
});

const p = assembly("plant-support-clip-rack");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
// A ring standing upright, facing the camera (-Y).
const ring = (x: number, y: number, z: number, R: number, r: number) => torus(R, r, 8).rotateX(90).translate(x, y, z);

// Frame: two uprights on splayed feet, top rail, board in between.
const UX = 450, H = 1500, BZ0 = 420;
for (const x of [-UX, UX]) {
  add(`foot-${x}`, blk(x, 0, 0, 60, 520, 40).color(frame));
  add(`foot-cap-front-${x}`, blk(x, -250, 0, 70, 30, 46).color('#2a2c2e'));
  add(`upright-${x}`, blk(x, 0, 40, 50, 50, H - 40).color(frame));
  add(`brace-${x}`, box(30, 30, 260, true).rotateX(-35).translate(x, -80, 150).color(frame));
}
add("top-rail", blk(0, 0, H, 2 * UX + 50, 50, 40).color(frame));
add("board", blk(0, 0, BZ0, 2 * UX - 50, 18, H - BZ0 - 40).color(board));
// Perforation grid hinted with dark holes on the face.
for (let i = 0; i < 8; i++) for (let j = 0; j < 9; j++) {
  add(`hole-${i}-${j}`, blk(-350 + i * 100, -10, BZ0 + 64 + j * 110, 12, 2, 12).color('#5a5d5f'));
}

// Two rows of pegs with bundles of round truss clips (big) and stem clips (small).
for (const [row, z, R, r] of [[0, 1280, 52, 6], [1, 1020, 36, 5]] as [number, number, number, number][]) {
  for (let i = 0; i < 4; i++) {
    const x = -300 + i * 200;
    add(`peg-${row}-${i}`, cylY(x, -9, z, 150, 7, 8).color(frame));
    for (let k = 0; k < 2 - row; k++) add(`clip-${row}-${i}-${k}`, ring(x, -50 - k * 40, z - R + 7, R, r).color(clips));
  }
}

// Rollerhook row: wire J-hook over a rail, twine spool below.
if (hooks.value === 'on') {
  add("hook-rail", cylinder(800, 8, 8).rotateY(90).translate(-400, -40, 800).color(frame));
  for (const x of [-300, -150, 0, 150, 300]) {
    add(`hook-${x}`, blk(x, -40, 650, 8, 8, 160).color('#b9bec1'));
    add(`hook-top-${x}`, blk(x, -24, 800, 8, 40, 8).color('#b9bec1'));
    add(`spool-${x}`, cylY(x, -15, 610, 60, 40, 12).color(twine));
    add(`spool-cheek-a-${x}`, cylY(x, -10, 610, 6, 50, 12).color('#2a2c2e'));
    add(`spool-cheek-b-${x}`, cylY(x, -75, 610, 6, 50, 12).color('#2a2c2e'));
    add(`twine-tail-${x}`, cylZ(x + 38, -45, 470, 140, 2, 4).color(twine));
  }
}

// Shelf with a bin of loose clips.
add("shelf", blk(0, -120, 380, 2 * UX - 50, 260, 25).color(frame));
add("bin", blk(-150, -140, 405, 380, 200, 130).color('#2f5e8c'));
add("bin-fill", blk(-150, -140, 520, 350, 170, 12).color(clips));
for (const [x, y] of [[-230, -170], [-80, -120]]) add(`loose-${x}`, torus(34, 5, 8).rotateX(70).translate(x, y, 548).color(clips));
add("twine-box", blk(220, -140, 405, 260, 200, 180).color('#b08a55'));
add("twine-box-label", blk(220, -241, 470, 160, 2, 60).color(twine));

return p.model();
