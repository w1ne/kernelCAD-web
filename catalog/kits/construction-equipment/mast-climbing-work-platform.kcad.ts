// SPDX-License-Identifier: CC0-1.0
// Mast-climbing work platform: the twin-mast access deck that bricklayers and
// cladding crews climb up a facade instead of scaffolding it.
// What makes it one rather than a box: two square lattice masts with racks,
// each standing on a chassis with four outriggers and screw-jack pads, a long
// chequer-plate deck carried between them by climbing drive units with motors
// and gearboxes, telescopic deck extensions on the facade side, full
// guardrails with mid rails and toe boards on the open sides, a materials
// pallet on the deck and wall ties back to the building.
// Generic visualization geometry at real size (deck about 9 m long, masts 6 m
// tall), millimetres, Z up, jack pads on z = 0, facade on +Y.
meta({
  name: "mast-climbing-work-platform",
  license: 'CC0-1.0',
  title: "Mast-climbing work platform",
  description: "Twin-mast climbing work platform at real size: two square lattice masts with racks on outrigger chassis with screw-jack pads, a long chequer-plate deck carried by climbing drive units with motors and gearboxes, facade-side deck extensions, guardrails with mid rails and toe boards, a materials pallet and wall ties. Deck level choice low or raised. Material controls: deck and drive paint, galvanised mast steel, guardrail paint, materials; siteYellow, highVisibility and weathered presets.",
  tags: ['mast climbing work platform', 'MCWP', 'facade access', 'climbing platform', 'twin mast', 'construction equipment', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 6000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const level = param('level', 'raised', { choices: ['low', 'raised'], label: 'Deck level' });
const deckPaint = param('deckPaint', '#2f6aa8', { label: 'Deck and drive paint' });
const mastSteel = param('mastSteel', '#a6aeb1', { label: 'Galvanised mast steel' });
const railPaint = param('railPaint', '#e9b81c', { label: 'Guardrail paint' });
const materials = param('materials', '#b35a3c', { label: 'Pallet load (brick)' });
presets({
  siteYellow: { deckPaint: '#e2a51b', railPaint: '#2f3437' },
  highVisibility: { deckPaint: '#e2601d', railPaint: '#f3d32a', mastSteel: '#c3c9cb' },
  weathered: { deckPaint: '#4f6a82', mastSteel: '#86877f', railPaint: '#b39a4d', materials: '#93624c' },
});

const p = assembly('mast-climbing-work-platform');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Tube from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const ring = Array.from({ length: n }, (_, i) => [r * Math.cos(((i + 0.5) / n) * Math.PI * 2), r * Math.sin(((i + 0.5) / n) * Math.PI * 2)]);
  return extrudePolygon(ring, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const XM = 2600;               // mast spacing half
const M = 230;                 // half mast width
const ZB = 450;                // chassis top
const N = 4;                   // mast sections
const SL = 1508;
const ZTOP = ZB + N * SL;
const ZD = level.value === 'raised' ? 3200 : 1200;  // deck top
const DL = 9000;               // deck length
const D0 = -M - 120;           // deck facade-side edge (masts sit at the facade edge)
const DW = 1500;               // deck width toward -Y

for (const s of [-1, 1]) {
  const k = s < 0 ? 'left' : 'right';
  const x0 = s * XM;
  // Chassis with four outriggers and screw-jack pads.
  add(`chassis-${k}`, box(1300, 1300, 260, true).translate(x0, 0, ZB - 130).color(deckPaint));
  for (let i = 0; i < 4; i++) {
    const a = ((i * 90 + 45) * Math.PI) / 180;
    const ex = x0 + 1500 * Math.cos(a);
    const ey = 1500 * Math.sin(a);
    add(`outrigger-${k}-${i}`, rod([x0 + 500 * Math.cos(a), 500 * Math.sin(a), ZB - 130], [ex, ey, ZB - 130], 60, 4).color(deckPaint));
    add(`jack-screw-${k}-${i}`, rod([ex, ey, 40], [ex, ey, ZB - 50], 28, 8).color(mastSteel));
    add(`jack-handle-${k}-${i}`, rod([ex - 120, ey, ZB - 60], [ex + 120, ey, ZB - 60], 12, 6).color(mastSteel));
    add(`jack-pad-${k}-${i}`, box(300, 300, 40, true).translate(ex, ey, 20).color(railPaint));
  }
  // Lattice mast with rack facing the deck.
  for (const [i, [x, y]] of [[-M, -M], [M, -M], [M, M], [-M, M]].entries()) {
    add(`mast-${k}-chord-${i}`, rod([x0 + x, y, ZB], [x0 + x, y, ZTOP], 30, 8).color(mastSteel));
  }
  for (let j = 0; j < N; j++) {
    const z0 = ZB + j * SL;
    add(`mast-${k}-flange-${j}`, box(2 * M + 70, 2 * M + 70, 24, true).translate(x0, 0, z0 + 12).color(mastSteel));
    for (const [f, [a, b]] of [[[-M, -M], [M, -M]], [[-M, -M], [-M, M]], [[M, -M], [M, M]]].entries()) {
      add(`mast-${k}-lace-${j}-${f}-lo`, rod([x0 + a[0], a[1], z0 + 30], [x0 + b[0], b[1], z0 + SL / 2], 12).color(mastSteel));
      add(`mast-${k}-lace-${j}-${f}-hi`, rod([x0 + b[0], b[1], z0 + SL / 2], [x0 + a[0], a[1], z0 + SL - 30], 12).color(mastSteel));
    }
  }
  add(`mast-${k}-cap`, box(2 * M + 70, 2 * M + 70, 24, true).translate(x0, 0, ZTOP).color(mastSteel));
  add(`mast-${k}-rack`, box(50, 40, N * SL - 40, true).translate(x0, -M - 30, ZB + (N * SL) / 2).color(deckPaint));
  // Wall tie to the facade at +Y.
  add(`wall-tie-${k}`, rod([x0, M, ZTOP - 900], [x0, M + 900, ZTOP - 900], 30).color(mastSteel));
  add(`wall-tie-${k}-plate`, box(300, 20, 300, true).translate(x0, M + 910, ZTOP - 900).color(mastSteel));
  // Climbing drive unit around the mast under the deck.
  add(`drive-frame-${k}`, box(2 * M + 260, 2 * M + 260, 900, true).translate(x0, 0, ZD - 520).color(deckPaint));
  add(`drive-window-${k}`, box(2 * M + 40, 2 * M + 280, 600, true).translate(x0, 0, ZD - 520).color(mastSteel));
  for (const [i, dz] of [-760, -280].entries()) {
    add(`drive-gearbox-${k}-${i}`, box(300, 240, 220, true).translate(x0 + s * 360, -M - 260, ZD + dz).color(deckPaint));
    add(`drive-motor-${k}-${i}`, cylinder(340, 105, 12).rotateY(s * 90).translate(x0 + s * 510, -M - 260, ZD + dz).color(deckPaint));
    add(`drive-brake-${k}-${i}`, cylinder(90, 80, 12).rotateY(s * 90).translate(x0 + s * 850, -M - 260, ZD + dz).color(mastSteel));
  }
}

// Chequer-plate deck with stringers, facade-side extensions and guardrails.
const cy = D0 - DW / 2;
add('deck-plate', box(DL, DW, 40, true).translate(0, cy, ZD - 20).color(mastSteel));
for (const [i, y] of [D0 - 60, cy, D0 - DW + 60].entries()) {
  add(`deck-stringer-${i}`, box(DL, 80, 200, true).translate(0, y, ZD - 140).color(deckPaint));
}
for (let i = 0; i <= 8; i++) {
  add(`deck-joist-${i}`, box(80, DW, 160, true).translate(-DL / 2 + 40 + (i * (DL - 80)) / 8, cy, ZD - 120).color(deckPaint));
}
for (const [i, x] of [-XM - 1700, 0, XM + 1700].entries()) {
  add(`deck-extension-${i}`, box(1700, 600, 30, true).translate(x, D0 + 300, ZD - 15).color(mastSteel));
  add(`extension-arm-${i}`, box(1700, 60, 120, true).translate(x, D0 + 300, ZD - 90).color(deckPaint));
}
const rails = [[[-DL / 2, D0 - DW], [DL / 2, D0 - DW]], [[-DL / 2, D0 - DW], [-DL / 2, D0]], [[DL / 2, D0 - DW], [DL / 2, D0]]];
for (const [i, [a, b]] of rails.entries()) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  add(`guardrail-top-${i}`, rod([a[0], a[1], ZD + 1100], [b[0], b[1], ZD + 1100], 24).color(railPaint));
  add(`guardrail-mid-${i}`, rod([a[0], a[1], ZD + 550], [b[0], b[1], ZD + 550], 20).color(railPaint));
  add(`toe-board-${i}`, box(len, 20, 150, true).rotateZ(ang).translate(mid[0], mid[1], ZD + 75).color(railPaint));
  const n = Math.max(1, Math.round(len / 1500));
  for (let j = 0; j <= n; j++) {
    const t = j / n;
    add(`guardrail-post-${i}-${j}`, rod([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), ZD], [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), ZD + 1100], 24).color(railPaint));
  }
}

// Pallet of bricks and a mortar tub on the deck.
add('pallet', box(1200, 1000, 140, true).translate(-1300, cy, ZD + 70).color(deckPaint));
add('brick-stack', box(1100, 900, 600, true).translate(-1300, cy, ZD + 440).color(materials));
add('brick-stack-straps', box(1120, 920, 30, true).translate(-1300, cy, ZD + 500).color(mastSteel));
add('mortar-tub', cylinder(300, 330, 14).translate(1200, cy, ZD).color(railPaint));

return p.model();
