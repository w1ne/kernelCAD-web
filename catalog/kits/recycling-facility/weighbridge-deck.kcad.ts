// SPDX-License-Identifier: CC0-1.0
// Weighbridge deck: the surface-mounted truck scale every load crosses on its
// way into a recovery site. What makes it a weighbridge rather than a steel
// slab: a long modular deck sitting on deep I-beam side stringers, carried at
// each module joint by stainless load cells on concrete foundation plinths
// (the gap under the deck is what lets it float and weigh), anti-slip tread
// bars across the plate, yellow guide kerbs along both edges so trucks track
// straight, hazard-striped end plates, and a load-cell junction box on the
// lane side. The number of 6 m modules is a parameter.
// Generic visualization geometry at about real size (3 m wide, 620 mm deck
// height), millimetres, Z up, traffic runs along X, lane side on -Y.

meta({
  name: "weighbridge-deck",
  license: 'CC0-1.0',
  title: "Weighbridge deck",
  description: "Surface-mounted truck weighbridge at about real size: modular 3 m wide steel deck with anti-slip tread bars on deep I-beam side stringers, stainless load cells on concrete foundation plinths at every module joint, yellow guide kerbs along both edges, hazard-striped end plates and a lane-side junction box. Two or three 6 m modules. Material controls: deck, concrete, guide kerbs and load cells. blueDeck, galvanised and weathered presets.",
  tags: ["weighbridge", "truck scale", "vehicle scale", "load cell", "recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const deck = param('deck', '#2f5f86', { label: 'Deck and stringers (painted steel)' });
const concrete = param('concrete', '#9a9b94', { label: 'Foundation concrete' });
const kerb = param('kerb', '#f0c419', { label: 'Guide kerbs (safety yellow)' });
const loadCell = param('loadCell', '#c3c9cb', { label: 'Load cells (stainless)' });
const modules = param('modules', '2', { choices: ['2', '3'], label: 'Deck modules (6 m each)' });

presets({
  blueDeck: { deck: '#2f5f86', concrete: '#9a9b94', kerb: '#f0c419', loadCell: '#c3c9cb' },
  galvanised: { deck: '#a7adaa', concrete: '#9a9b94', kerb: '#e8b41c', loadCell: '#d5dadb' },
  weathered: { deck: '#5b5246', concrete: '#86857c', kerb: '#b99a3a', loadCell: '#9ea4a3' },
});

const p = assembly("weighbridge-deck");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Cross-section [[y, z], ...] extruded along X from x0 to x1.
const prismX = (pts: number[][], x0: number, x1: number) => extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);

const n = modules.value === '3' ? 3 : 2;
const ML = 6000;
const L = n * ML;
const X0 = -L / 2;
const W = 3000;
const DZ = 620; // deck top
const SY = W / 2 - 150; // stringer centre line
const SB = 300; // stringer underside

// Foundation plinths at each module joint and both ends, with a load cell each side.
for (let j = 0; j <= n; j++) {
  const x = X0 + j * ML + (j === 0 ? 350 : j === n ? -350 : 0);
  add(`plinth-${j}`, blk(x, 0, 0, 700, W + 200, 160).color(concrete));
  for (const [s, side] of [[-1, 'l'], [1, 'r']] as const) {
    const y = s * SY;
    add(`cell-base-${j}-${side}`, blk(x, y, 160, 260, 260, 20).color(loadCell));
    add(`cell-${j}-${side}`, cylinder(100, 62, 14).translate(x, y, 180).color(loadCell));
    add(`cell-cap-${j}-${side}`, cylinder(20, 80, 14).translate(x, y, 280).color('#5d6366'));
    if (s === -1) add(`cell-cable-${j}`, blk(x - 120, y - 70, 215, 170, 16, 16).color('#1d1f21'));
  }
}

// I-beam side stringers along the full length.
const I = (y: number) => [
  [y - 120, SB], [y + 120, SB], [y + 120, SB + 22], [y + 10, SB + 22], [y + 10, DZ - 42],
  [y + 120, DZ - 42], [y + 120, DZ - 20], [y - 120, DZ - 20], [y - 120, DZ - 42], [y - 10, DZ - 42],
  [y - 10, SB + 22], [y - 120, SB + 22],
];
for (const [s, side] of [[-1, 'l'], [1, 'r']] as const) add(`stringer-${side}`, prismX(I(s * SY), X0, X0 + L).color(deck));
// Cross girders visible between the stringers at each module joint.
for (let j = 1; j < n; j++) add(`cross-girder-${j}`, blk(X0 + j * ML, 0, SB + 40, 220, W - 300, DZ - SB - 60).color(deck));

// Deck plate per module, with a dark joint seam and anti-slip tread bars.
for (let j = 0; j < n; j++) {
  const xm = X0 + j * ML + ML / 2;
  add(`deck-plate-${j}`, blk(xm, 0, DZ - 20, ML - 20, W, 20).color(deck));
  for (let k = 0; k < 18; k++) {
    const x = xm - ML / 2 + 300 + k * 320;
    add(`tread-${j}-${k}`, blk(x, 0, DZ, 40, W - 500, 8).color('#3a4650'));
  }
}
for (let j = 1; j < n; j++) add(`joint-seam-${j}`, blk(X0 + j * ML, 0, DZ - 20, 20, W, 22).color('#16181a'));
// Deck edge skirt on the lane side so the stringer reads as a fascia.
add("edge-skirt-l", blk(0, -W / 2 + 6, DZ - 140, L, 12, 140).color(deck));
add("edge-skirt-r", blk(0, W / 2 - 6, DZ - 140, L, 12, 140).color(deck));

// Hazard-striped end plates.
for (const [e, x] of [['in', X0], ['out', X0 + L]] as const) {
  for (let k = 0; k < 10; k++) {
    add(`end-stripe-${e}-${k}`, blk(x + (e === 'in' ? -8 : 8), -W / 2 + 150 + k * 300, DZ - 160, 16, 300, 160).color(k % 2 ? '#1b1c1d' : kerb));
  }
}

// Guide kerbs: posts and a round top rail along both edges.
for (const [s, side] of [[-1, 'l'], [1, 'r']] as const) {
  const y = s * (W / 2 - 60);
  const posts = n * 4 + 1;
  for (let k = 0; k < posts; k++) {
    const x = X0 + 200 + (k * (L - 400)) / (posts - 1);
    add(`kerb-post-${side}-${k}`, blk(x, y, DZ, 90, 90, 110).color(kerb));
  }
  add(`kerb-rail-${side}`, cylinder(L - 300, 55, 10).rotateY(90).translate(X0 + 150, y, DZ + 150).color(kerb));
}

// Junction box on the lane side, on a short post at the middle joint.
const JX = X0 + (n === 3 ? ML : ML) - 600;
add("jbox-post", blk(JX, -W / 2 - 500, 0, 80, 80, 700).color('#5d6366'));
add("jbox", blk(JX, -W / 2 - 500, 700, 360, 160, 300).color('#d9dcd6'));
add("jbox-lid-seam", blk(JX, -W / 2 - 582, 700, 340, 4, 280).color('#9a9d98'));
add("jbox-label", blk(JX, -W / 2 - 586, 900, 140, 4, 60).color(kerb));
add("jbox-cable", blk(JX + 150, -W / 2 - 300, 40, 40, 400, 40).color('#1d1f21'));

return p.model();
