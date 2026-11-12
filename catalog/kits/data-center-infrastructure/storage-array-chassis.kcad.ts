// SPDX-License-Identifier: CC0-1.0
// Storage array chassis: illustrative 4U, 24-bay rack storage system. Unlike
// a compute server, the front is mostly removable drive carriers and the back
// has two separate controller modules. Low-poly scene geometry, millimetres,
// Z up, not a vendor chassis or a fabrication-ready model.

meta({
  name: 'storage-array-chassis',
  license: 'CC0-1.0',
  title: 'Storage array chassis',
  description: 'Illustrative CC0 low-poly 4U storage array with 24 distinct front drive carriers in a 6×4 grid, paired pull handles, two rear controller bays, two rear power modules, rack ears and slide rails. Not a vendor manufacturing model. Material controls: painted steel and engineering polymer; facilityStandard and highVisibility presets.',
  tags: ['data center', 'storage array', 'rack enclosure', 'server storage', 'drive bay', 'IT equipment', 'low poly', 'scene prop', 'CC0'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#4f7485', { label: 'Painted steel' });
const polymer = param('polymer', '#c99b35', { label: 'Engineering polymer' });
presets({
  facilityStandard: { steel: '#4f7485', polymer: '#c99b35' },
  highVisibility: { steel: '#d99b22', polymer: '#263e48' },
});

const p = assembly('storage-array-chassis');
// Boxes are specified by their bottom Z coordinate; keep Z=0 as the base.
const body = (x: number, y: number, z: number, w: number, d: number, h: number) =>
  box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

// 4U approximate 19-inch rack envelope (176 mm high); front is negative Y.
p.part('chassis-shell', body(0, 0, 0, 440, 680, 176).color(steel));
p.part('front-panel', body(0, -352, 8, 430, 24, 160).color(steel));
for (const [name, x] of [['left', -230], ['right', 230]] as const) {
  p.part(`rack-ear-${name}`, body(x, -340, 0, 24, 56, 176).color(steel));
  p.part(`slide-rail-${name}`, body(x, 0, 29, 16, 620, 32).color(steel));
  // Exposed grip bar and its two attachments form a usable front pull handle.
  p.part(`handle-${name}`, body(x, -391, 37, 14, 16, 102).color(polymer));
  p.part(`handle-${name}-lower-mount`, body(x, -375, 33, 14, 40, 16).color(steel));
  p.part(`handle-${name}-upper-mount`, body(x, -375, 133, 14, 40, 16).color(steel));
}

// 24 individually removable front carriers: six columns, four rows.
for (let row = 0; row < 4; row++) {
  for (let col = 0; col < 6; col++) {
    const x = -170 + 68 * col;
    const z = 18 + 38 * row;
    p.part(`drive-carrier-${row}-${col}`, body(x, -373, z, 58, 22, 31).color(polymer));
    p.part(`drive-grip-${row}-${col}`, body(x, -387, z + 10, 38, 6, 9).color(steel));
  }
}

// Rear redundant controllers and two separately serviceable power modules.
for (const [name, x] of [['left', -106], ['right', 106]] as const) {
  p.part(`rear-controller-${name}`, body(x, 353, 60, 172, 26, 80).color(polymer));
  p.part(`rear-controller-pull-${name}`, body(x, 369, 88, 110, 8, 14).color(steel));
  p.part(`rear-power-module-${name}`, body(x, 352, 12, 172, 24, 36).color(steel));
}

return p.model();
