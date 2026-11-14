// SPDX-License-Identifier: CC0-1.0
// Seedling propagation cart: a mobile germination rack that carries trays
// of seedlings under their own grow lights and wheels them out to the
// transplant line when they are ready.
// What makes it a propagation cart: a tall open steel-tube frame on four
// swivel casters, wire shelves each holding a 2 x 2 block of seed trays, a
// pair of LED grow-light bars hung under every shelf above the trays, a
// push handle on one end, and a timer box with a power lead for the lights.
// Generic visualization geometry at about real size (1.25 m long, 0.62 m
// deep, 1.75 m tall), millimetres, Z up, open long side toward -Y.

meta({
  name: "seedling-propagation-cart",
  license: 'CC0-1.0',
  title: "Seedling propagation cart",
  description: "Mobile seedling germination cart at about real size: tall open steel-tube frame on four swivel casters, wire shelves each holding four seed trays of seedlings, twin LED grow-light bars under every shelf, an end push handle and a light timer box. Material controls: cart frame, seed trays, seedling foliage and LED light colour, plus a tier count choice. chrome, fullSpectrum, blackFrame and weathered presets.",
  tags: ['propagation cart', 'seedling cart', 'germination rack', 'grow rack', 'seed trays', 'grow lights', 'led', 'trolley', 'hydroponics', 'greenhouse', 'nursery', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 5000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#c3c8cc', { label: 'Cart frame (zinc-plated steel)' });
const trays = param('trays', '#2a2c2e', { label: 'Seed trays (polystyrene)' });
const foliage = param('foliage', '#79b94c', { label: 'Seedling foliage' });
const lights = param('lights', '#f4f0ff', { label: 'LED grow lights (diffuser glow)' });
const tiers = param('tiers', '4', { choices: ['3', '4'], label: 'Shelf tiers' });

presets({
  chrome: { frame: '#c3c8cc', trays: '#2a2c2e', foliage: '#79b94c', lights: '#f4f0ff' },
  fullSpectrum: { frame: '#c3c8cc', trays: '#2a2c2e', foliage: '#79b94c', lights: '#e48ae6' },
  blackFrame: { frame: '#34383b', trays: '#e6e6e0', foliage: '#6db544', lights: '#fff4dc' },
  weathered: { frame: '#8e8e86', trays: '#4a4a46', foliage: '#93a65a', lights: '#e8e2d0' },
});

const p = assembly("seedling-propagation-cart");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateX(90).translate(x, y + len / 2, z);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);

const L = 1200, W = 600; // frame length (X) and depth (Y)
const ZC = 150; // caster plate height
const n = Number(tiers.value);
const shelfZ = n === 4 ? [260, 640, 1020, 1400] : [300, 800, 1300];
const ZTOP = shelfZ[n - 1] + 300;

// Swivel casters under each corner post.
for (const sx of [-1, 1]) {
  for (const sy of [-1, 1]) {
    const x = sx * (L / 2 - 20), y = sy * (W / 2 - 20);
    const tag = `${sx > 0 ? 'r' : 'l'}${sy > 0 ? 'b' : 'f'}`;
    add(`caster-plate-${tag}`, blk(x, y, ZC - 10, 80, 80, 10).color('#6b7174'));
    add(`caster-swivel-${tag}`, cylZ(x, y, ZC - 30, 20, 26, 10).color('#6b7174'));
    add(`caster-fork-${tag}`, blk(x - 30, y, 60, 40, 50, ZC - 90).color('#6b7174'));
    add(`caster-wheel-${tag}`, cylY(x - 30, y, 50, 30, 50, 14).color('#25282a'));
    add(`caster-hub-${tag}`, cylY(x - 30, y - 2, 50, 34, 18, 8).color('#c3c8cc'));
  }
}

// Corner posts, top frame and end ladders.
for (const sx of [-1, 1]) {
  for (const sy of [-1, 1]) add(`post-${sx}-${sy}`, cylZ(sx * (L / 2 - 20), sy * (W / 2 - 20), ZC, ZTOP - ZC, 16, 10).color(frame));
  add(`top-end-${sx}`, cylY(sx * (L / 2 - 20), 0, ZTOP - 10, W - 40, 12, 8).color(frame));
}
for (const sy of [-1, 1]) add(`top-side-${sy}`, cylX(-L / 2 + 20, sy * (W / 2 - 20), ZTOP - 10, L - 40, 12, 8).color(frame));

// Push handle on the -X end.
for (const z of [ZTOP - 520, ZTOP - 180]) add(`handle-arm-${z}`, cylX(-L / 2 - 140, -150, z, 140, 12, 8).color(frame));
for (const z of [ZTOP - 520, ZTOP - 180]) add(`handle-arm-b-${z}`, cylX(-L / 2 - 140, 150, z, 140, 12, 8).color(frame));
for (const y of [-150, 150]) add(`handle-upright-${y}`, cylZ(-L / 2 - 140, y, ZTOP - 540, 380, 16, 10).color(frame));
add("handle-grip", cylY(-L / 2 - 140, 0, ZTOP - 350, 340, 20, 10).color('#25282a'));

// Shelves with seed trays and the LED bars hanging under the shelf above.
shelfZ.forEach((z, t) => {
  add(`shelf-frame-${t}`, blk(0, 0, z - 30, L - 20, W - 20, 30).subtract(blk(0, 0, z - 40, L - 60, W - 60, 50)).color(frame));
  for (let k = 0; k < 7; k++) add(`shelf-wire-${t}-${k}`, blk(-L / 2 + 160 + k * 147, 0, z - 14, 8, W - 50, 8).color(frame));
  add(`shelf-wire-long-${t}`, blk(0, 0, z - 8, L - 60, 8, 8).color(frame));
  for (const ix of [-1, 1]) {
    for (const iy of [-1, 1]) {
      const x = ix * 285, y = iy * 145;
      const tag = `${t}-${ix > 0 ? 'r' : 'l'}${iy > 0 ? 'b' : 'f'}`;
      add(`tray-${tag}`, blk(x, y, z, 545, 280, 60).subtract(blk(x, y, z + 8, 525, 260, 60)).color(trays));
      add(`soil-${tag}`, blk(x, y, z + 8, 525, 260, 40).color('#5a3f2a'));
      const tall = 25 + ((t * 3 + ix + iy + 4) % 3) * 22;
      add(`seedlings-${tag}`, blk(x, y, z + 48, 500, 240, tall).color(foliage));
      for (let s = 0; s < 3; s++) add(`tuft-${tag}-${s}`, blk(x - 170 + s * 170, y - 40 + (s % 2) * 80, z + 48 + tall, 140, 110, 14).color(foliage));
    }
  }
  // LED bars hang under the next shelf up (or the top frame).
  const zl = (t + 1 < n ? shelfZ[t + 1] : ZTOP) - 70;
  for (const y of [-150, 150]) {
    add(`led-bar-${t}-${y}`, blk(0, y, zl, L - 120, 50, 22).color('#3a3e41'));
    add(`led-diffuser-${t}-${y}`, blk(0, y, zl - 6, L - 140, 40, 6).color(lights));
    add(`led-hanger-${t}-${y}`, blk(0, y, zl + 22, 10, 10, 18).color(frame));
  }
});

// Light timer and power lead on the -X end post.
add("timer-box", blk(-L / 2 - 30, -W / 2 + 80, ZTOP - 260, 50, 120, 160).color('#d8d8d0'));
add("timer-dial", cylinder(12, 38, 12).rotateY(-90).translate(-L / 2 - 55, -W / 2 + 80, ZTOP - 180).color('#2f6fa8'));
add("power-lead", cylZ(-L / 2 - 30, -W / 2 + 80, ZC + 40, ZTOP - 300 - ZC, 6, 6).color('#1d2023'));
add("lead-plug", blk(-L / 2 - 30, -W / 2 + 80, ZC + 10, 40, 40, 40).color('#1d2023'));

return p.model();
