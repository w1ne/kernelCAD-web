// SPDX-License-Identifier: CC0-1.0
// Tyre drop-off rack: the galvanised two-tier stillage at a household
// recycling centre where the public leaves car tyres, so they are stored
// upright, off the ground and dry until the tyre collector takes them away.
// What makes it a tyre rack: four box-section uprights on base plates, two
// tiers of paired tube rails that cradle each tyre on its tread, tyres
// standing on edge with their faces toward the aisle (a few still on steel
// rims), a pallet stack of flat tyres beside it, a sign board on the top
// rail and yellow end guards against forklift strikes.
// Generic visualization geometry at about real size (3.2 m long, 1.4 m
// deep, 2.2 m high), millimetres, Z up, tyre faces toward -Y.

meta({
  name: "tyre-dropoff-rack",
  license: 'CC0-1.0',
  title: "Tyre drop-off rack",
  description: "Two-tier galvanised tyre storage rack at about real size: box-section uprights on base plates, paired tube cradle rails on each tier, upright car tyres with tread bands and some steel rims, a pallet stack of flat tyres, a sign board and yellow end guards. Material controls: steel frame, tyre rubber, wheel rims, safety guards and sign. galvanised, depotGreen, councilBlue and weathered presets.",
  tags: ['tyre', 'tire', 'tyre rack', 'stillage', 'storage rack', 'drop-off', 'household recycling centre', 'recycling', 'waste management', 'reception', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#a4acb0', { label: 'Rack frame (galvanised steel)' });
const rubber = param('rubber', '#2b2d2f', { label: 'Tyres (rubber)' });
const rim = param('rim', '#c3c8cb', { label: 'Wheel rims (pressed steel)' });
const safety = param('safety', '#f2c230', { label: 'End guards and sign (safety paint)' });

presets({
  galvanised: { steel: '#a4acb0', rubber: '#2b2d2f', rim: '#c3c8cb', safety: '#f2c230' },
  depotGreen: { steel: '#3f7a4a', rubber: '#2a2c2d', rim: '#b8bdc0', safety: '#f2c230' },
  councilBlue: { steel: '#2f5fa8', rubber: '#2b2d2f', rim: '#d2d6d8', safety: '#f07a1a' },
  weathered: { steel: '#7d7b72', rubber: '#3a3936', rim: '#8a6a52', safety: '#b89a3a' },
});

const p = assembly("tyre-dropoff-rack");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 10) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).rotateX(-90).translate(x, y, z);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);

const L = 3200, D = 700, H = 2200;
const TR = 320, TW = 200, TI = 205;
const tiers = [120, 1080];

// Uprights, base plates, top rails and diagonal ties.
for (const x of [-L / 2, L / 2]) for (const y of [-D / 2, D / 2]) {
  add(`upright-${x}-${y}`, blk(x, y, 10, 70, 70, H - 10).color(steel));
  add(`base-plate-${x}-${y}`, blk(x, y, 0, 160, 160, 10).color(steel));
}
for (const y of [-D / 2, D / 2]) add(`top-rail-${y}`, blk(0, y, H - 60, L, 60, 60).color(steel));
for (const x of [-L / 2, 0, L / 2]) add(`top-tie-${x}`, blk(x, 0, H - 60, 60, D, 60).color(steel));
add("mid-post-back", blk(0, D / 2, 10, 60, 60, H - 70).color(steel));
add("mid-post-front", blk(0, -D / 2, 10, 60, 60, H - 70).color(steel));

// Each tier: end beams plus two tube rails the tyres stand on.
for (const z of tiers) {
  for (const x of [-L / 2, L / 2]) add(`tier-beam-${z}-${x}`, blk(x, 0, z, 70, D, 80).color(steel));
  for (const y of [-60, 60]) add(`cradle-rail-${z}-${y}`, cylX(-L / 2, y, z + 110, L, 34).color(steel));
  add(`tier-back-beam-${z}`, blk(0, D / 2, z, L, 60, 80).color(steel));
}

// Tyres standing on edge, faces toward the aisle.
const tyre = (name: string, x: number, z: number, onRim: boolean) => {
  const y0 = -TW / 2;
  add(`${name}-tread`, cylY(x, y0, z + TR, TW, TR, 18).subtract(cylY(x, y0 - 5, z + TR, TW + 10, TI, 16)).color(rubber));
  add(`${name}-wall`, cylY(x, y0 - 6, z + TR, 6, TR - 40, 18).subtract(cylY(x, y0 - 10, z + TR, 14, TI, 16)).color('#3b3e40'));
  if (onRim) {
    add(`${name}-rim`, cylY(x, y0 + 30, z + TR, TW - 60, TI, 16).subtract(cylY(x, y0 + 25, z + TR, TW - 50, TI - 30, 16)).color(rim));
    add(`${name}-disc`, cylY(x, -10, z + TR, 20, TI - 25, 16).color(rim));
    add(`${name}-hub`, cylY(x, -30, z + TR, 30, 70, 12).color('#7e8487'));
  }
};
const xs = [-1150, -440, 440, 1150];
xs.forEach((x, i) => tyre(`low-tyre-${i}`, x, tiers[0] + 144, i === 1 || i === 3));
xs.forEach((x, i) => tyre(`high-tyre-${i}`, x, tiers[1] + 144, i === 2));

// Yellow end guards against forklift strikes.
for (const x of [-L / 2 - 160, L / 2 + 160]) {
  add(`guard-post-${x}`, cylZ(x, -D / 2 - 80, 0, 700, 50, 12).color(safety));
  add(`guard-band-${x}`, cylZ(x, -D / 2 - 80, 300, 80, 52, 12).color('#2f3437'));
}

// Sign board on the top rail.
add("sign-board", blk(0, -D / 2 - 40, H - 340, 1200, 10, 260).color(safety));
add("sign-panel", blk(0, -D / 2 - 47, H - 310, 1100, 4, 200).color('#2f3437'));
add("sign-icon", cylY(-430, -D / 2 - 54, H - 210, 4, 70, 14).subtract(cylY(-430, -D / 2 - 58, H - 210, 12, 40, 12)).color('#f2f2ec'));
for (let i = 0; i < 3; i++) add(`sign-text-${i}`, blk(80, -D / 2 - 51, H - 260 + i * 50, 640 - i * 120, 3, 22).color('#f2f2ec'));

// Pallet stack of flat tyres beside the rack.
const PX = -L / 2 - 900;
add("pallet", blk(PX, 0, 0, 1000, 1000, 130).color('#a07a4a'));
for (const y of [-400, 0, 400]) add(`pallet-skid-${y}`, blk(PX, y, 0, 1000, 120, 100).color('#8a663a'));
for (let k = 0; k < 4; k++) {
  const ox = (k % 2) * 20 - 10;
  add(`flat-tyre-${k}`, cylZ(PX + ox, ox, 130 + k * TW, TW - 6, TR, 18).subtract(cylZ(PX + ox, ox, 120 + k * TW, TW + 20, TI, 16)).color(rubber));
}

return p.model();
