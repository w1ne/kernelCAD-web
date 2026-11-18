// SPDX-License-Identifier: CC0-1.0
// A compact site hoist has a braced twin-rail mast, guided load platform,
// drive on the carriage, overhead sheave and transportable wheeled base.
// Mast height and platform guard choices change the machine layout.
meta({
  name: 'portable-material-hoist',
  license: 'CC0-1.0',
  title: 'Portable material hoist',
  description: 'Compact construction material hoist with a braced twin-rail mast, toothed rack, guided load platform and carriage, drive unit, overhead sheave, transport wheels and stabilizing outriggers. Choose short or standard mast and open or guarded platform. Material controls: equipment enamel, structural steel, hoist cable steel and tire rubber; weathered and highVisibility presets.',
  tags: ['construction equipment', 'material hoist', 'site logistics', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'structure',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const mastHeightChoice = param('mastHeight', 'standard', { choices: ['short', 'standard'], label: 'Mast height' });
const platformStyle = param('platformStyle', 'guarded', { choices: ['open', 'guarded'], label: 'Load platform' });
const equipmentEnamel = param('equipmentEnamel', '#e1a31b', { label: 'Equipment enamel' });
const structuralSteel = param('structuralSteel', '#89969a', { label: 'Structural steel' });
const hoistCableSteel = param('hoistCableSteel', '#4f595d', { label: 'Hoist cable and drive steel' });
const tireRubber = param('tireRubber', '#25292b', { label: 'Transport tire rubber' });
presets({
  weathered: { equipmentEnamel: '#a87b36', structuralSteel: '#716b61', hoistCableSteel: '#454b4d', tireRubber: '#302d2a' },
  highVisibility: { equipmentEnamel: '#f06b26', structuralSteel: '#c1c7c2', hoistCableSteel: '#536064', tireRubber: '#202326' },
});

const mastHeight = mastHeightChoice.value === 'short' ? 1380 : 1940;
const platformZ = 490;
const p = assembly('portable-material-hoist');
const colorMaterial = (shape, finish) => {
  if (finish === equipmentEnamel) return shape.color(equipmentEnamel);
  if (finish === structuralSteel) return shape.color(structuralSteel);
  if (finish === hoistCableSteel) return shape.color(hoistCableSteel);
  if (finish === tireRubber) return shape.color(tireRubber);
  return shape.color(finish);
};
const add = (name, shape, finish) => p.part(name, colorMaterial(shape.scale(scale), finish));
const boxAt = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z);
const barBetween = (a, b, r, n = 10) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const length = Math.hypot(dx, dy, dz);
  return cylinder(length, r, n)
    .rotateY((Math.acos(dz / length) * 180) / Math.PI)
    .rotateZ((Math.atan2(dy, dx) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

// A wheeled chassis and paired telescoping outriggers lift the load frame off
// the ground. The wheels sit beneath the crossmembers and the jack feet bear
// on the floor.
add('base-crossbeam-front', boxAt(0, -180, 108, 720, 96, 84), structuralSteel);
add('base-crossbeam-rear', boxAt(0, 184, 108, 720, 96, 84), structuralSteel);
add('base-side-rail-left', boxAt(-300, 0, 108, 96, 520, 84), equipmentEnamel);
add('base-side-rail-right', boxAt(300, 0, 108, 96, 520, 84), equipmentEnamel);
for (const side of [-1, 1]) {
  add(`outrigger-${side}`, boxAt(side * 384, 0, 82, 330, 62, 64), structuralSteel);
  add(`outrigger-jack-${side}`, boxAt(side * 514, 0, 39, 48, 48, 22), hoistCableSteel);
  add(`outrigger-foot-${side}`, boxAt(side * 514, 0, 14, 118, 118, 28), equipmentEnamel);
  for (const y of [-168, 172]) {
    add(`transport-tire-${side}-${y}`, cylinder(92, 64, 12).rotateX(90).translate(side * 280, y + 46, 64), tireRubber);
    add(`wheel-hub-${side}-${y}`, cylinder(96, 30, 12).rotateX(90).translate(side * 280, y + 48, 64), structuralSteel);
  }
}

// The twin mast rails, cross ties and back diagonals hold a visible rack down
// the center. This is a generic static visualization, not a load-rated frame.
for (const side of [-1, 1]) {
  const x = side * 134;
  add(`mast-rail-${side}`, boxAt(x, 128, (mastHeight + 160) / 2, 76, 72, mastHeight - 160), equipmentEnamel);
  add(`mast-guide-${side}`, boxAt(x, 67, (mastHeight + 180) / 2, 34, 30, mastHeight - 180), structuralSteel);
  add(`rear-brace-${side}`, barBetween([side * 300, 208, 150], [x, 208, mastHeight - 90], 22), structuralSteel);
}
for (let z = 250; z < mastHeight - 80; z += 240) {
  add(`mast-cross-tie-${z}`, boxAt(0, 128, z, 326, 62, 40), structuralSteel);
  add(`rack-tooth-${z}`, boxAt(0, 185, z, 72, 30, 52), hoistCableSteel);
}
add('mast-top-crosshead', boxAt(0, 128, mastHeight - 65, 390, 114, 70), equipmentEnamel);

// A load platform runs in front of the mast with its own carriage rails,
// rack-and-pinion drive cover, toe boards and selectable cage rails.
add('carriage-backplate', boxAt(0, 49, platformZ + 208, 410, 68, 455), structuralSteel);
add('platform-deck', boxAt(0, -174, platformZ, 560, 470, 38), equipmentEnamel);
add('platform-toe-front', boxAt(0, -407, platformZ + 68, 560, 28, 128), structuralSteel);
add('platform-toe-left', boxAt(-267, -180, platformZ + 68, 28, 426, 128), structuralSteel);
add('platform-toe-right', boxAt(267, -180, platformZ + 68, 28, 426, 128), structuralSteel);
for (const side of [-1, 1]) {
  const x = side * 224;
  add(`carriage-guide-roller-${side}`, cylinder(54, 38, 10).rotateX(90).translate(x, 66, platformZ + 240), hoistCableSteel);
  add(`pinion-gearbox-${side}`, boxAt(x, 6, platformZ + 154, 124, 148, 170), equipmentEnamel);
  add(`guide-clamp-${side}`, boxAt(x, 95, platformZ + 212, 116, 54, 72), structuralSteel);
}
if (platformStyle.value === 'guarded') {
  for (const side of [-1, 1]) {
    const x = side * 250;
    for (const y of [-382, 25]) {
      add(`cage-post-${side}-${y}`, boxAt(x, y, platformZ + 378, 28, 28, 492), equipmentEnamel);
    }
    add(`cage-top-side-${side}`, boxAt(x, -178, platformZ + 624, 28, 434, 28), equipmentEnamel);
    for (const z of [platformZ + 260, platformZ + 430]) add(`cage-rail-${side}-${z}`, boxAt(x, -178, z, 24, 432, 22), structuralSteel);
  }
  for (const z of [platformZ + 260, platformZ + 430, platformZ + 624]) {
    add(`cage-front-rail-${z}`, boxAt(0, -382, z, 504, 24, 24), structuralSteel);
  }
}

// The mast-top sheave and cable explain the lifting path; a drive motor and
// guarded drum sit on the moving carriage, separate from the rack teeth.
add('sheave-axis', cylinder(338, 30, 12).rotateY(90).translate(-169, 128, mastHeight - 28), structuralSteel);
add('sheave-wheel', cylinder(52, 48, 12).rotateY(90).translate(-26, 128, mastHeight - 28), hoistCableSteel);
add('hoist-cable', barBetween([0, 150, mastHeight - 30], [0, 150, platformZ + 454], 7, 8), hoistCableSteel);
add('drive-motor', cylinder(148, 66, 12).rotateX(90).translate(0, 132, platformZ + 95), hoistCableSteel);
add('drive-cover', boxAt(0, 37, platformZ + 96, 190, 180, 138), equipmentEnamel);
add('service-control-box', boxAt(316, -58, 362, 118, 108, 152), equipmentEnamel);
add('control-switch', cylinder(22, 20, 10).translate(316, -58, 445), structuralSteel);

return p.model();
