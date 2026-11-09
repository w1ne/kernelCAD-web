// SPDX-License-Identifier: CC0-1.0
// Net pot stack: the slotted plastic cups that hold plants in raft, NFT and
// DWC systems, shown as a nested stack of spares next to two cups in use.
// What makes it a net pot: a tapered cup made of open ribs rather than a
// solid wall (so roots grow straight out into the water), a wide flat lip
// that rests on the raft or channel lid, and a slotted base ring. Spares
// nest, so a stack shows only a column of lips; cups in use hold a rockwool
// cube or clay pebbles with a seedling.
// Generic visualization geometry at real size (2 in or 3 in cups),
// millimetres, Z up, loose cups toward -Y.

meta({
  name: "net-pot-stack",
  license: 'CC0-1.0',
  title: "Net pot stack",
  description: "Hydroponic net pots at real size: a nested stack of spare slotted cups beside one cup with a rockwool cube and one with clay pebbles, both carrying seedlings. Each cup has open tapered ribs, a wide flat lip and a slotted base ring. Material controls: cup plastic, rockwool, clay pebbles and seedling foliage, plus cup size (2 in or 3 in) and stack height choices. classicBlack, whiteCups, mintGreen and weathered presets.",
  tags: ['net pot', 'net cup', 'mesh pot', 'slotted cup', 'rockwool', 'clay pebbles', 'hydroton', 'seedling', 'dwc', 'nft', 'hydroponics', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 6400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cup = param('cup', '#232527', { label: 'Net cups (polypropylene)' });
const rockwool = param('rockwool', '#cdb98a', { label: 'Rockwool cube' });
const pebbles = param('pebbles', '#b3603a', { label: 'Clay pebbles' });
const foliage = param('foliage', '#78bb4a', { label: 'Seedling foliage' });
const size = param('size', '3in', { choices: ['2in', '3in'], label: 'Cup size' });
const stackCount = param('stack', '8', { choices: ['5', '8', '12'], label: 'Cups in stack' });

presets({
  classicBlack: { cup: '#232527', rockwool: '#cdb98a', pebbles: '#b3603a', foliage: '#78bb4a' },
  whiteCups: { cup: '#ecece6', rockwool: '#cdb98a', pebbles: '#b3603a', foliage: '#6db544' },
  mintGreen: { cup: '#7fc4a4', rockwool: '#d6c493', pebbles: '#a9583a', foliage: '#5aa83c' },
  weathered: { cup: '#55554f', rockwool: '#b3a47e', pebbles: '#94664d', foliage: '#8aa35a' },
});

const p = assembly("net-pot-stack");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const ring = (rOut: number, rIn: number, h: number, seg = 20) => cylinder(h, rOut, seg).subtract(cylinder(h + 2, rIn, seg).translate(0, 0, -1));
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 4) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const big = size.value === '3in';
const RT = big ? 38 : 26; // top radius under the lip
const RB = big ? 27 : 19; // base radius
const CH = big ? 70 : 52; // cup height
const LIP = big ? 46 : 33; // lip radius
const RIBS = 10;

// One net cup at (x, y, z): base ring, open ribs, top band and flat lip.
const netCup = (name: string, x: number, y: number, z: number) => {
  add(`${name}-base`, ring(RB, RB - 9, 4).translate(x, y, z).color(cup));
  add(`${name}-base-hub`, cylZ(x, y, z, 4, 6, 8).color(cup));
  for (const a of [0, 60, 120]) add(`${name}-base-spoke-${a}`, blk(0, 0, 0, 2 * RB - 6, 3, 4).rotateZ(a).translate(x, y, z).color(cup));
  for (let k = 0; k < RIBS; k++) {
    const a = (k / RIBS) * 2 * Math.PI;
    add(`${name}-rib-${k}`, rod([x + RB * Math.cos(a), y + RB * Math.sin(a), z + 2], [x + RT * Math.cos(a), y + RT * Math.sin(a), z + CH - 8], 2.4).color(cup));
  }
  add(`${name}-mid-band`, ring((RB + RT) / 2 + 1.5, (RB + RT) / 2 - 1.5, 3).translate(x, y, z + CH * 0.45).color(cup));
  add(`${name}-top-band`, ring(RT + 1, RT - 2, 10).translate(x, y, z + CH - 10).color(cup));
  add(`${name}-lip`, ring(LIP, RT - 2, 3, 24).translate(x, y, z + CH - 3).color(cup));
};

// Seedling: stem, cotyledon pair and two true leaves.
const seedling = (name: string, x: number, y: number, z: number, turn: number) => {
  add(`${name}-stem`, cylZ(x, y, z, 45, 1.8, 5).color('#9cbf6a'));
  add(`${name}-cotyledons`, sphere(10).scale([2.2, 0.8, 0.25]).rotateZ(turn).translate(x, y, z + 32).color(foliage));
  add(`${name}-leaf-a`, sphere(16).scale([1.6, 0.9, 0.25]).rotateY(-20).rotateZ(turn + 90).translate(x, y, z + 46).color(foliage));
  add(`${name}-leaf-b`, sphere(13).scale([1.6, 0.9, 0.25]).rotateY(20).rotateZ(turn - 90).translate(x, y, z + 50).color(foliage));
};

// Nested stack of spares on the +Y side: one full cup plus a lip per nested cup.
const n = Number(stackCount.value);
const SX = 10, SY = 120;
const STEP = big ? 11 : 9;
netCup('stack-0', SX, SY, 0);
for (let k = 1; k < n; k++) {
  const z = k * STEP;
  add(`stack-${k}-band`, ring(RT + 1, RT - 2, 10).translate(SX, SY, z + CH - 10).color(cup));
  add(`stack-${k}-lip`, ring(LIP, RT - 2, 3, 24).translate(SX, SY, z + CH - 3).color(cup));
}

// Cup with a rockwool cube.
const AX = -LIP * 2 - 10, AY = -40;
netCup('cube-cup', AX, AY, 0);
const cube = big ? 40 : 30;
add("rockwool-cube", blk(AX, AY, CH - cube + 12, cube, cube, cube).color(rockwool));
add("rockwool-hole", cylZ(AX, AY, CH + 8, 5, 6, 8).color('#9a8a62'));
seedling('cube-seedling', AX, AY, CH + 10, 30);
for (const [dx, dy] of [[-6, 4], [5, -3], [2, 6]]) {
  add(`root-${dx}-${dy}`, rod([AX + dx, AY + dy, CH - cube + 14], [AX + dx * 2.5, AY + dy * 2.5, 6], 1.2, 3).color('#efe9d6'));
}

// Cup filled with clay pebbles.
const BX = LIP * 2 + 10, BY = -50;
netCup('pebble-cup', BX, BY, 0);
const PR = big ? 9 : 7;
const ringPts = [[0, 0], [RT * 0.55, 0], [-RT * 0.55, 0], [0, RT * 0.55], [0, -RT * 0.55], [RT * 0.4, RT * 0.4], [-RT * 0.4, -RT * 0.4], [RT * 0.4, -RT * 0.4], [-RT * 0.4, RT * 0.4]];
ringPts.forEach(([dx, dy], k) => {
  add(`pebble-${k}`, sphere(PR).translate(BX + dx, BY + dy, CH - PR + (k % 3) * 3).color(pebbles));
});
seedling('pebble-seedling', BX, BY, CH + 4, -20);

return p.model();
