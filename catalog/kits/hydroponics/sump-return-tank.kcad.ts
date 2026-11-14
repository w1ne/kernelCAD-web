// SPDX-License-Identifier: CC0-1.0
// Sump return tank: the low collection tank at the bottom of a recirculating
// hydroponic system, where drain water from the beds falls back before it is
// pumped on to filtration and re-dosing.
// What makes it a return sump: a ribbed rotomoulded tank on runners, a
// galvanised bar screen over most of the top that catches roots and media
// from the two return drops (each ending in a strainer basket), and a pump
// bay with a hinged lid where a submersible pump stands in the solution with
// a float switch beside it, its riser climbing through a check valve and ball
// valve to the outlet line. A sight tube shows the level from outside.
// Generic visualization geometry at about real size (1.5 x 1.0 m, about
// 650 L), millimetres, Z up, front toward -Y.

meta({
  name: "sump-return-tank",
  license: 'CC0-1.0',
  title: "Sump return tank",
  description: "Recirculating hydroponic return sump at about real size: ribbed rotomoulded tank on runners, galvanised bar screen over the top, two return drops from behind ending in strainer baskets, a pump bay with hinged lid, submersible pump and float switch in the solution, riser with check valve and ball valve to the outlet line, sight-tube level gauge and drain valve. Material controls: tank, screen and runners, pipework, solution, plus an open or closed pump-bay lid. blackPoly, nutrientGreen, whiteTank and weathered presets.",
  tags: ['sump', 'return tank', 'collection tank', 'recirculating', 'submersible pump', 'float switch', 'drain water', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 3400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tank = param('tank', '#2f3336', { label: 'Tank (rotomoulded polyethylene)' });
const grate = param('screen', '#a9b0b3', { label: 'Bar screen and runners (galvanised steel)' });
const pipe = param('pipework', '#8f989e', { label: 'Pipework (PVC-U)' });
const water = param('solution', '#5f9a8c', { label: 'Nutrient solution' });
const lid = param('pumpBayLid', 'open', { choices: ['open', 'closed'], label: 'Pump bay lid' });

presets({
  blackPoly: { tank: '#2f3336', screen: '#a9b0b3', pipework: '#8f989e', solution: '#5f9a8c' },
  nutrientGreen: { tank: '#3f6b48', screen: '#c9ced1', pipework: '#e6e8e4', solution: '#7fae6a' },
  whiteTank: { tank: '#e8e6dc', screen: '#8c969b', pipework: '#3b3f42', solution: '#4f8fa8' },
  weathered: { tank: '#4a4d48', screen: '#8b8a80', pipework: '#a6a28e', solution: '#6f7f5a' },
});

const p = assembly("sump-return-tank");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 6) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const ZR = 760; // tank rim top
const ZW = 430; // solution level
const BX = 510; // pump bay centre (x 320..700, y -450..-10)
const BY = -230;

// Tank on two runners: open tub, rim lip, wall ribs, the solution inside.
for (const y of [-350, 350]) add(`runner-${y < 0 ? 'f' : 'b'}`, blk(0, y, 0, 1560, 100, 60).color(grate));
add("tank", blk(0, 0, 60, 1500, 1000, ZR - 60).subtract(blk(0, 0, 100, 1400, 900, ZR)).color(tank));
add("rim-lip", blk(0, 0, ZR - 20, 1540, 1040, 20).subtract(blk(0, 0, ZR - 30, 1400, 900, 40)).color(tank));
for (const x of [-420, -140, 140, 420]) add(`rib-front-${x}`, blk(x, -505, 60, 60, 20, ZR - 80).color(tank));
for (const y of [-250, 250]) add(`rib-side-${y}`, blk(-755, y, 60, 20, 60, ZR - 80).color(tank));
add("solution", blk(0, 0, 100, 1400, 900, ZW - 100).color(water));
add("tank-label", blk(-280, -502, 450, 200, 4, 110).color('#e3b52c'));

// Bar screen over the return side of the tank.
add("screen-rail-f", blk(-190, -435, ZR, 1020, 30, 30).color(grate));
add("screen-rail-b", blk(-190, 435, ZR, 1020, 30, 30).color(grate));
add("screen-rail-l", blk(-685, 0, ZR, 30, 900, 30).color(grate));
add("screen-rail-r", blk(305, 0, ZR, 30, 900, 30).color(grate));
for (let k = 0; k < 15; k++) add(`screen-bar-${k}`, blk(-640 + k * 64, 0, ZR, 12, 840, 24).color(grate));
add("screen-tie", blk(-190, 0, ZR - 20, 1000, 24, 20).color(grate));
add("bay-cover-back", blk(BX, 220, ZR, 390, 460, 12).color(tank));
add("bay-kerb", blk(BX, -10, ZR, 390, 20, 40).color(tank));

// Two return drops from behind, each over a strainer basket on the screen.
for (const x of [-480, -80]) {
  add(`return-${x}-run`, cylY(x, 700, 1060, 700, 45, 14).color(pipe));
  add(`return-${x}-elbow`, cylZ(x, 0, 1010, 100, 52, 14).color(pipe));
  add(`return-${x}-drop`, cylZ(x, 0, 860, 160, 45, 14).color(pipe));
  add(`return-${x}-flange`, cylY(x, 720, 1060, 20, 70, 14).color(pipe));
  add(`return-${x}-basket`, cylZ(x, 0, ZR + 24, 70, 90, 16).subtract(cylZ(x, 0, ZR + 34, 70, 78, 16)).color(grate));
  add(`return-${x}-post`, blk(x, 640, 0, 60, 60, 1000).color(grate));
  add(`return-${x}-saddle`, blk(x, 640, 1000, 120, 80, 14).color(grate));
}

// Pump bay: submersible pump and float switch standing in the solution.
add("pump-body", cylZ(BX, BY, 100, 330, 90, 16).color('#2f6fa8'));
add("pump-motor-cap", cylZ(BX, BY, 430, 30, 80, 16).color('#22262a'));
add("pump-handle", blk(BX, BY + 50, 460, 150, 16, 50).subtract(blk(BX, BY + 50, 460, 110, 30, 35)).color('#22262a'));
add("pump-cable", rod([BX - 40, BY + 40, 460], [BX - 150, -40, ZR + 20], 7).color('#22262a'));
add("float-cable", rod([660, -440, ZR + 10], [650, -400, ZW + 40], 5).color('#22262a'));
add("float", sphere(42).translate(650, -400, ZW + 10).color('#e8862b'));
// Riser: union, check valve, elbow, ball valve on the outlet line.
add("riser", cylZ(BX, BY, 460, 1010 - 460, 28, 12).color(pipe));
add("riser-union", cylZ(BX, BY, 560, 50, 42, 6).color(pipe));
add("check-valve", cylZ(BX, BY, 800, 110, 42, 12).color('#3b3f42'));
add("check-arrow", blk(BX, BY - 44, 830, 14, 4, 50).color('#f2f2ec'));
add("riser-elbow", cylZ(BX, BY, 970, 76, 38, 12).color(pipe));
add("outlet-line", cylY(BX, 700, 1010, 700 - BY, 28, 12).color(pipe));
add("outlet-valve", cylY(BX, 260, 1010, 80, 40, 12).color('#3b3f42'));
add("outlet-lever", blk(BX + 40, 220, 1055, 120, 24, 14).color('#c0392b'));
add("outlet-post", blk(BX, 640, 0, 60, 60, 975).color(grate));
add("outlet-flange", cylY(BX, 720, 1010, 20, 60, 12).color(pipe));

// Pump bay lid on two hinges along its back edge.
for (const dx of [-140, 140]) add(`lid-hinge-${dx}`, cylX(BX + dx - 30, -10, ZR + 40, 60, 14, 8).color(grate));
if (lid.value === 'open') {
  // Built spanning y -440..0, swung up past vertical about its back edge.
  const swing = (s: Shape) => s.rotateX(-100).translate(BX, -10, ZR + 40);
  add("lid", swing(blk(0, -220, -20, 380, 440, 20)).color(tank));
  add("lid-label", swing(blk(0, -240, -22, 200, 120, 2)).color('#e3b52c'));
} else {
  add("lid", blk(BX, -230, ZR, 380, 440, 20).color(tank));
  add("lid-label", blk(BX, -260, ZR + 20, 200, 120, 2).color('#e3b52c'));
}

// Sight-tube level gauge and drain valve on the front wall.
add("gauge-port-low", cylY(-620, -500, 190, 30, 16, 10).color(pipe));
add("gauge-port-high", cylY(-620, -500, 660, 30, 16, 10).color(pipe));
add("gauge-tube", cylZ(-620, -540, 170, 510, 14, 10).color('#cfe3e8'));
add("gauge-level", cylZ(-620, -540, 172, ZW - 172, 15, 10).color(water));
add("drain-stub", cylY(-280, -500, 110, 70, 22, 10).color(pipe));
add("drain-valve", cylY(-280, -540, 110, 60, 34, 12).color('#3b3f42'));
add("drain-lever", blk(-280, -570, 150, 90, 20, 12).color('#c0392b'));

return p.model();
