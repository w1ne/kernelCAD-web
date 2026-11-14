// SPDX-License-Identifier: CC0-1.0
// LED cyc wash light: the long low batten fixture set on the stage floor in
// front of the cyclorama to wash it evenly with colour from below.
// What makes it a cyc light rather than a strip light: a metre-long extruded
// housing with a chamfered asymmetric nose; a frosted front lens over three
// rows of multi-colour LED cells; deep heat-sink fins on the back; cast end
// caps carrying power and data connectors; and a floor yoke with hand-knob
// trunnions that tips the whole fixture up toward the cloth.
// Generic visualization geometry at about real size (1.1 m wide, 0.34 m deep,
// 0.42 m tall), millimetres, Z up, lens facing -Y and up, standing on z = 0.

meta({
  name: "led-cyc-wash-light",
  license: 'CC0-1.0',
  title: "LED cyc wash light",
  description: "Floor-standing LED cyclorama wash light at about real size: metre-long extruded housing with chamfered nose, frosted front lens over three rows of multi-colour LED cells, deep rear heat-sink fins, cast end caps with power and data connectors, and a floor yoke with hand-knob trunnions tilting it up at the cloth. Material controls: housing, front lens, LED cells, yoke and knobs; tilt angle. houseShow, touring and whiteHousing presets.",
  tags: ['cyc light', 'cyclorama', 'led wash', 'groundrow', 'stage lighting', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 6000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tilt = param('tilt', 'up', { choices: ['flat', 'up', 'steep'], label: 'Tilt toward the cyc' });

const housing = param('housing', '#23272a', { label: 'Extruded housing' });
const lens = param('lens', '#d9e3e8', { label: 'Frosted front lens' });
const cells = param('cells', '#7a5cff', { label: 'LED cells' });
const yoke = param('yoke', '#5d6468', { label: 'Floor yoke and knobs' });

presets({
  houseShow: { housing: '#23272a', lens: '#d9e3e8', cells: '#7a5cff', yoke: '#5d6468' },
  touring: { housing: '#141618', lens: '#c6d2d8', cells: '#ff4fa3', yoke: '#2a2e31' },
  whiteHousing: { housing: '#e6e8e6', lens: '#f2f5f6', cells: '#3fb6ff', yoke: '#b8bec0' },
});

const RUBBER = '#141618';
const CON_BLUE = '#2f6fd0';

const p = assembly("led-cyc-wash-light");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Side profile drawn in (y, z) and extruded t wide along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const L = 1000;
const TZ = 250; // trunnion height
const ANGLE = tilt.value === 'flat' ? 0 : tilt.value === 'steep' ? 45 : 25;
// Build the head around the trunnion axis, lens on -Y, then tip it up.
const aim = (shape: Shape) => shape.rotateX(-ANGLE).translate(0, 0, TZ);

add("housing", aim(profileYZ([[-95, -70], [-70, -110], [80, -110], [80, 110], [-70, 110], [-95, 70]], L)).color(housing));
add("lens", aim(box(L - 30, 8, 150, true).translate(0, -97, 0)).color(lens));
for (let r = 0; r < 3; r++)
  for (let i = 0; i < 14; i++)
    add(`cell-${r}-${i}`, aim(cylinder(6, 16, 10).rotateX(90).translate(-L / 2 + 50 + i * 69, -100, -45 + r * 45)).color(cells));
for (let k = 0; k < 9; k++) add(`fin-${k}`, aim(box(L - 40, 50, 10, true).translate(0, 105, -96 + k * 24)).color(housing));

// Cast end caps with connectors on the right-hand cap.
for (const sx of [-1, 1]) add(`end-cap-${sx}`, aim(box(30, 220, 250, true).translate(sx * (L / 2 + 15), -5, 0)).color(yoke));
add("power-in", aim(cylinder(24, 22, 14).rotateY(90).translate(L / 2 + 30, 20, -50)).color(CON_BLUE));
add("power-out", aim(cylinder(24, 22, 14).rotateY(90).translate(L / 2 + 30, 20, 0)).color('#c9ccc8'));
add("data-in", aim(cylinder(20, 15, 12).rotateY(90).translate(L / 2 + 30, 20, 50)).color(RUBBER));

// Floor yoke: two cheek plates rising to the trunnions, joined by a floor bar.
const YX = L / 2 + 50;
for (const sx of [-1, 1]) {
  add(`yoke-arm-${sx}`, box(14, 70, TZ + 20, true).translate(sx * YX, 0, 20 + (TZ + 20) / 2 - 10).color(yoke));
  add(`knob-stem-${sx}`, cylinder(40, 12, 12).rotateY(90).translate(sx > 0 ? YX : -YX - 40, 0, TZ).color(yoke));
  add(`knob-${sx}`, cylinder(26, 40, 8).rotateY(90).translate(sx > 0 ? YX + 30 : -YX - 56, 0, TZ).color(RUBBER));
  add(`foot-${sx}`, box(90, 320, 20, true).translate(sx * YX, 0, 16).color(yoke));
  for (const sy of [-1, 1]) add(`pad-${sx}-${sy}`, cylinder(6, 22, 10).translate(sx * YX, sy * 130, 0).color(RUBBER));
}
add("floor-bar", box(2 * YX, 50, 30, true).translate(0, 120, 35).color(yoke));

return p.model();
