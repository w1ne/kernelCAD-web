// SPDX-License-Identifier: CC0-1.0
// Adjustable stage leg: one telescoping steel leg of the kind that holds up a
// portable stage deck, shown standing on its own at mid extension.
// What makes it a stage leg rather than a post: a round floor plate with a
// rubber isolation pad and four welded gussets, a square outer sleeve with a
// T-handle clamp screw, an inner tube with a row of adjustment holes and a
// spring pin through one of them, a fine-adjust screw jack and a square deck
// head plate with bolt holes and a socket spigot that drops into the deck.
// Generic visualization geometry at about real size (about 0.9 m tall at mid
// extension), millimetres, Z up, front toward -Y, pad standing on z = 0.

meta({
  name: "adjustable-stage-leg",
  license: 'CC0-1.0',
  title: "Adjustable stage leg",
  description: "Telescoping steel stage-deck leg at about real size: round floor plate on a rubber isolation pad with four welded gussets, square outer sleeve with a T-handle clamp screw, inner tube with a row of adjustment holes and a spring locking pin, fine-adjust screw jack with hand nut, and a square deck head plate with bolt holes and socket spigot. Material controls: painted steel, zinc hardware, rubber pad, hi-vis band. houseShow, touring and blackout presets; short, mid and full extension.",
  tags: ['stage leg', 'telescopic leg', 'deck leg', 'riser leg', 'staging', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const extension = param('extension', 'mid', { choices: ['short', 'mid', 'full'], label: 'Leg extension' });

const paintedSteel = param('paintedSteel', '#3c444b', { label: 'Painted steel' });
const hardware = param('hardware', '#c9ced1', { label: 'Zinc-plated hardware' });
const rubber = param('rubber', '#1c1e20', { label: 'Rubber pad and grips' });
const band = param('band', '#e8b21c', { label: 'Hi-vis height band' });

presets({
  houseShow: { paintedSteel: '#3c444b', hardware: '#c9ced1', rubber: '#1c1e20', band: '#e8b21c' },
  touring: { paintedSteel: '#d8a21f', hardware: '#b9bfc3', rubber: '#202326', band: '#1f2124' },
  blackout: { paintedSteel: '#1d1f22', hardware: '#55595d', rubber: '#141516', band: '#d8d8d8' },
});

const p = assembly("adjustable-stage-leg");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const EXT = extension.value === 'short' ? 120 : extension.value === 'full' ? 420 : 260; // inner tube showing
const SLEEVE_TOP = 520;
const INNER_TOP = SLEEVE_TOP + EXT;

// Base: rubber pad, floor plate, four gussets, sleeve.
add("pad", cylinder(12, 165, 24).color(rubber));
add("floor-plate", cylinder(14, 160, 24).translate(0, 0, 12).color(paintedSteel));
for (let k = 0; k < 4; k++) {
  const g = extrudePolygon([[0, 0], [95, 0], [0, 150]], 10).rotateX(90).translate(0, 5, 0);
  add(`gusset-${k}`, g.translate(38, 0, 26).rotateZ(45 + k * 90).color(paintedSteel));
}
add("sleeve", blk(0, 0, 26, 76, 76, SLEEVE_TOP - 26).color(paintedSteel));
add("sleeve-collar", blk(0, 0, SLEEVE_TOP - 40, 92, 92, 40).color(paintedSteel));
add("height-band", blk(0, 0, 300, 78, 78, 30).color(band));

// T-handle clamp screw on the front of the collar.
add("clamp-boss", cylinder(28, 18, 12).rotateX(90).translate(0, -46, SLEEVE_TOP - 20).color(hardware));
add("clamp-screw", cylinder(40, 8, 8).rotateX(90).translate(0, -72, SLEEVE_TOP - 20).color(hardware));
add("clamp-handle", cylinder(110, 10, 10).rotateY(90).translate(-55, -116, SLEEVE_TOP - 20).color(rubber));

// Inner tube with its adjustment-hole row and a spring pin.
add("inner-tube", blk(0, 0, SLEEVE_TOP - 40, 58, 58, EXT + 60).color(hardware));
const holes = Math.floor((EXT - 30) / 60);
for (let i = 0; i < holes; i++)
  add(`adjust-hole-${i}`, blk(0, -29.5, SLEEVE_TOP + 30 + i * 60, 20, 2, 20).color(rubber));
add("pin-shaft", cylinder(110, 7, 8).rotateY(90).translate(-55, 0, SLEEVE_TOP + 10).color(hardware));
add("pin-ring", torus(22, 4).rotateY(90).translate(-62, 0, SLEEVE_TOP - 12).color(hardware));
add("pin-lanyard", cylinder(150, 2, 6).translate(-46, -30, SLEEVE_TOP - 150).color(rubber));

// Screw jack and deck head.
add("jack-screw", cylinder(110, 14, 12).translate(0, 0, INNER_TOP).color(hardware));
add("jack-nut", cylinder(26, 34, 6).translate(0, 0, INNER_TOP + 20).color(paintedSteel));
for (let k = 0; k < 3; k++)
  add(`jack-nut-wing-${k}`, blk(0, 0, INNER_TOP + 24, 100, 12, 18).rotateZ(k * 60).color(paintedSteel));
const HZ = INNER_TOP + 110;
add("head-plate", blk(0, 0, HZ, 200, 200, 12).color(paintedSteel));
for (const [i, [x, y]] of [[-70, -70], [70, -70], [-70, 70], [70, 70]].entries())
  add(`head-bolt-${i}`, cylinder(10, 11, 6).translate(x, y, HZ + 12).color(hardware));
add("socket-spigot", cylinder(60, 26, 16).translate(0, 0, HZ + 12).color(paintedSteel));
add("spigot-tip", cylinder(10, 20, 16).translate(0, 0, HZ + 72).color(rubber));

return p.model();
