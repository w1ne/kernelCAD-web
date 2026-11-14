// SPDX-License-Identifier: CC0-1.0
// Stage power distro: the rolling power distribution rack that takes the
// venue feed and splits it into breakered circuits for lighting, sound and
// automation.
// What makes it a power distro rather than a cabinet: a road case with
// aluminium edge extrusions, ball corners, recessed side handles and casters;
// an open front panel with a row of five single-pole feeder connectors in the
// colour code (green earth, white neutral, black, red and blue phases); a
// large main breaker; three analogue phase meters with pilot lamps; a row of
// twelve branch breakers; and multi-pin and duplex outlets along the bottom.
// Generic visualization geometry at about real size (0.8 m x 0.6 m, 1.05 m
// tall on casters), millimetres, Z up, panel toward -Y, standing on z = 0.

meta({
  name: "stage-power-distro",
  license: 'CC0-1.0',
  title: "Stage power distro",
  description: "Rolling stage power distribution rack at about real size: road case with aluminium edge extrusions, ball corners, recessed side handles and casters; open front panel with five colour-coded single-pole feeder connectors, main breaker, three phase meters with pilot lamps, twelve branch breakers, two multi-pin outlets and four duplex outlets. Material controls: road case shell, edge trim and corners, front panel, breaker toggles. houseShow, touring and greyRack presets.",
  tags: ['power distro', 'power distribution', 'company switch', 'breaker panel', 'road case', 'feeder', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 4500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const shell = param('shell', '#1e2124', { label: 'Road case shell' });
const trim = param('trim', '#b8c0c4', { label: 'Edge trim and ball corners' });
const panel = param('panel', '#6f7a82', { label: 'Front panel' });
const breakers = param('breakers', '#f0efe8', { label: 'Breaker toggles' });

presets({
  houseShow: { shell: '#1e2124', trim: '#b8c0c4', panel: '#6f7a82', breakers: '#f0efe8' },
  touring: { shell: '#2a3f6a', trim: '#d4d8da', panel: '#24282b', breakers: '#f2c230' },
  greyRack: { shell: '#8c949a', trim: '#5c656b', panel: '#e3e1da', breakers: '#d6372d' },
});

const BLACK = '#18191b';
const METER_FACE = '#f4f2ea';
const NEEDLE = '#d63228';
const LAMP = '#5fd068';
const LABEL = '#e8e6de';
const CAMLOK = ['#2f9a4a', '#efefea', '#1f2124', '#d1322a', '#2f62c8'];
const CAM_ID = ['earth', 'neutral', 'phase-a', 'phase-b', 'phase-c'];

const p = assembly("stage-power-distro");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const knob = (r: number, len: number, n = 16) => cylinder(len, r, n).rotateX(90); // runs toward -Y

const W = 800;
const D = 600;
const Z0 = 130; // case bottom
const H = 920;
const FY = -D / 2;

// Road case with aluminium edge extrusions and ball corners.
add("case", blk(0, 0, Z0, W, D, H).color(shell));
for (const x of [-W / 2, W / 2])
  for (const y of [-D / 2, D / 2]) {
    const id = `${x < 0 ? 'l' : 'r'}${y < 0 ? 'f' : 'b'}`;
    add(`edge-v-${id}`, blk(x, y, Z0, 26, 26, H).color(trim));
    for (const [zs, z] of [["low", Z0], ["high", Z0 + H]] as [string, number][])
      add(`corner-${id}-${zs}`, sphere(26).translate(x, y, z).color(trim));
  }
for (const [zs, z] of [["low", Z0 - 13], ["high", Z0 + H - 13]] as [string, number][]) {
  for (const y of [-D / 2, D / 2]) add(`edge-x-${zs}-${y < 0 ? 'f' : 'b'}`, blk(0, y, z, W, 26, 26).color(trim));
  for (const x of [-W / 2, W / 2]) add(`edge-y-${zs}-${x < 0 ? 'l' : 'r'}`, blk(x, 0, z, 26, D, 26).color(trim));
}

// Recessed spring handles on both sides.
for (const [s, x] of [["left", -W / 2 - 4], ["right", W / 2 + 4]] as [string, number][]) {
  add(`handle-dish-${s}`, blk(x, 0, Z0 + 620, 10, 220, 130).color(trim));
  add(`handle-bar-${s}`, blk(x + Math.sign(x) * 12, 0, Z0 + 650, 18, 160, 24).color(BLACK));
}

// Casters: plate, fork and a wheel flattened where it meets the floor.
for (const x of [-W / 2 + 90, W / 2 - 90])
  for (const y of [-D / 2 + 90, D / 2 - 90]) {
    const id = `${x < 0 ? 'l' : 'r'}${y < 0 ? 'f' : 'b'}`;
    add(`caster-plate-${id}`, blk(x, y, Z0 - 12, 110, 110, 12).color(trim));
    add(`caster-fork-${id}`, blk(x, y, 50, 60, 70, Z0 - 62).color(trim));
    add(`caster-wheel-${id}`, cylinder(40, 52, 16).rotateY(90).translate(-20, 0, 50).subtract(box(80, 140, 20, true).translate(0, 0, -10)).translate(x, y, 0).color(BLACK));
  }

// Front panel inside the trim frame.
add("front-panel", blk(0, FY - 3, Z0 + 30, W - 70, 6, H - 60).color(panel));
const PY = FY - 6;

// Five single-pole feeder connectors in colour code, with label strip.
for (let i = 0; i < 5; i++) {
  const x = -300 + i * 72;
  add(`feeder-${CAM_ID[i]}`, knob(26, 70).translate(x, PY, Z0 + 720).color(CAMLOK[i]));
  add(`feeder-${CAM_ID[i]}-collar`, knob(32, 16).translate(x, PY, Z0 + 720).color(BLACK));
}
add("feeder-label", blk(-156, PY - 1, Z0 + 650, 340, 3, 26).color(LABEL));

// Main breaker with its handle.
add("main-breaker", blk(200, PY - 25, Z0 + 640, 200, 50, 160).color(BLACK));
add("main-breaker-handle", blk(200, PY - 65, Z0 + 700, 60, 30, 70).color(breakers));

// Three phase meters with pilot lamps.
for (let i = 0; i < 3; i++) {
  const x = -260 + i * 120;
  add(`meter-${i}`, blk(x, PY - 10, Z0 + 790, 100, 20, 90).color(BLACK));
  add(`meter-${i}-face`, blk(x, PY - 21, Z0 + 800, 82, 3, 70).color(METER_FACE));
  add(`meter-${i}-needle`, box(4, 3, 50, true).rotateY(-25 + i * 20).translate(x, PY - 24, Z0 + 830).color(NEEDLE));
  add(`lamp-${i}`, knob(10, 14, 12).translate(160 + i * 50, PY, Z0 + 840).color(LAMP));
}

// Row of twelve branch breakers with numbering strip.
add("breaker-rail", blk(0, PY - 4, Z0 + 470, W - 140, 8, 110).color(BLACK));
for (let i = 0; i < 12; i++) {
  const x = -308 + i * 56;
  add(`breaker-${i + 1}`, blk(x, PY - 22, Z0 + 482, 42, 26, 86).color(BLACK));
  add(`breaker-${i + 1}-toggle`, blk(x, PY - 44, Z0 + 520, 18, 22, 28).color(breakers));
}
add("breaker-label", blk(0, PY - 1, Z0 + 435, W - 140, 3, 22).color(LABEL));

// Outlets: two multi-pin connectors with caps, four duplex outlets.
for (const [i, x] of [[1, -240], [2, -80]] as [number, number][]) {
  add(`multipin-${i}-shell`, knob(56, 60, 18).translate(x, PY, Z0 + 230).color(BLACK));
  add(`multipin-${i}-face`, knob(40, 6, 18).translate(x, PY - 60, Z0 + 230).color(trim));
  add(`multipin-${i}-cap`, knob(20, 10, 12).translate(x, PY - 66, Z0 + 230).color(BLACK));
}
for (let i = 0; i < 4; i++) {
  const x = 70 + i * 75;
  add(`duplex-${i + 1}`, blk(x, PY - 12, Z0 + 150, 60, 24, 160).color(BLACK));
  for (const [j, z] of [[0, Z0 + 270], [1, Z0 + 190]] as [number, number][])
    add(`duplex-${i + 1}-socket-${j}`, knob(22, 6, 14).translate(x, PY - 24, z).color(breakers));
}

return p.model();
