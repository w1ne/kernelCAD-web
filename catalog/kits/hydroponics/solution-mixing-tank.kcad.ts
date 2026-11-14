// SPDX-License-Identifier: CC0-1.0
// Solution mixing tank: the cone-bottom batch tank in which concentrated
// fertiliser is dissolved into water before it is pumped to the stock or
// feed tanks.
// What makes it a mixing tank: a ribbed rotomoulded vessel with a conical
// bottom on a four-leg steel stand, a gearmotor agitator on a bridge across
// the dome, a hinged manway lid standing open over the solution, a water
// fill line, a front level sight tube with graduations, a bottom outlet ball
// valve with a camlock hose, and a sack of fertiliser waiting beside it.
// Generic visualization geometry at about real size (500 L or 1000 L),
// millimetres, Z up, front toward -Y.

meta({
  name: "solution-mixing-tank",
  license: 'CC0-1.0',
  title: "Solution mixing tank",
  description: "Cone-bottom nutrient mixing tank at about real size: ribbed rotomoulded vessel on a braced four-leg stand with a support ring, gearmotor agitator on a bridge over the dome, hinged manway lid open over the solution, water fill line, front level sight tube with graduations, bottom outlet ball valve with camlock hose, and a fertiliser sack by the leg. Material controls: tank, stand, agitator motor, fittings, plus a 500 L / 1000 L choice. naturalPoly, blackUv, bluePoly and weathered presets.",
  tags: ['mixing tank', 'batch tank', 'cone bottom tank', 'agitator', 'mixer', 'fertiliser', 'nutrient solution', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tank = param('tank', '#e3dcc2', { label: 'Tank (polyethylene)' });
const stand = param('stand', '#a9b0b3', { label: 'Stand (galvanised steel)' });
const motor = param('motor', '#3a78a8', { label: 'Agitator motor (painted steel)' });
const fitting = param('fittings', '#8f989e', { label: 'Fittings (PVC-U)' });
const volume = param('volume', '1000 L', { choices: ['500 L', '1000 L'], label: 'Volume' });

presets({
  naturalPoly: { tank: '#e3dcc2', stand: '#a9b0b3', motor: '#3a78a8', fittings: '#8f989e' },
  blackUv: { tank: '#2b2e30', stand: '#8f989e', motor: '#c0392b', fittings: '#5a6066' },
  bluePoly: { tank: '#3a6fa0', stand: '#d9dcde', motor: '#2a2d30', fittings: '#eceeea' },
  weathered: { tank: '#c8bd98', stand: '#8b8a80', motor: '#4f6a80', fittings: '#a6a28e' },
});

const p = assembly("solution-mixing-tank");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const turned = (pts: [number, number][], seg = 28) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const t = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(t).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const big = volume.value === '1000 L';
const R = big ? 560 : 430; // shell radius
const HC = big ? 1050 : 850; // straight shell height
const HK = big ? 380 : 300; // cone height
const ZS = 450; // outlet (cone tip) height
const ZK = ZS + HK; // cone-to-shell joint
const ZT = ZK + HC; // shoulder
const ZD = ZT + 90; // flat dome top

// Vessel: cone bottom, straight shell, domed shoulder, revolved.
add("vessel", turned([[0, ZS], [70, ZS], [R, ZK], [R, ZT], [R - 60, ZT + 60], [R * 0.48, ZD], [0, ZD]])
  .subtract(cylZ(0, -R * 0.3, ZD - 60, 80, R * 0.22, 20)).color(tank));
for (const [i, f] of [0.3, 0.65].entries()) add(`rib-${i}`, cylZ(0, 0, ZK + HC * f, 36, R + 12, 28).color(tank));
add("solution", cylZ(0, -R * 0.3, ZD - 60, 3, R * 0.22, 20).color('#3f8f8a'));
add("swirl", box(R * 0.3, 20, 3, true).rotateZ(30).translate(0, -R * 0.3, ZD - 56).color('#7fc4be'));
// Manway lid hinged on its +Y edge, standing open toward the bridge.
const LR = R * 0.22 + 20;
const HY = -R * 0.3 + LR;
add("lid", cylZ(0, -LR, -10, 20, LR, 20).rotateX(-100).translate(0, HY, ZD + 10).color(tank));
add("lid-handle", blk(0, -2 * LR + 30, 10, 80, 20, 20).rotateX(-100).translate(0, HY, ZD + 10).color(fitting));
add("lid-hinge", cylX(-40, HY, ZD + 10, 80, 10, 8).color('#5a6066'));

// Stand: four legs, support ring under the shell, cross braces, feet.
const LZ = ZK + 150;
const RL = R * 0.82;
for (let k = 0; k < 4; k++) {
  const a = ((45 + k * 90) * Math.PI) / 180;
  const x = RL * Math.cos(a);
  const y = RL * Math.sin(a);
  add(`leg-${k}`, blk(x, y, 20, 60, 60, LZ - 20).color(stand));
  add(`foot-${k}`, blk(x, y, 0, 140, 140, 20).color(stand));
  add(`brace-${k}`, box(2 * RL * Math.SQRT1_2, 40, 40, true).rotateZ(k * 90).translate(0, 0, 280).translate(RL * Math.SQRT1_2 * (k === 0 ? 1 : k === 2 ? -1 : 0), RL * Math.SQRT1_2 * (k === 1 ? 1 : k === 3 ? -1 : 0), 0).color(stand));
}
add("support-ring", cylZ(0, 0, ZK, 60, R + 20, 28).subtract(cylZ(0, 0, ZK - 10, 80, R - 10, 28)).color(stand));
add("ring-gusset-l", blk(-R - 10, 0, ZK - 80, 20, 60, 80).color(stand));

// Agitator: bridge across the dome, gearbox and vertical motor.
const BY = R * 0.18;
add("bridge", blk(0, BY, ZD, 2 * R - 140, 120, 70).color(stand));
for (const sx of [-1, 1]) add(`bridge-post-${sx > 0 ? 'r' : 'l'}`, blk(sx * (R - 100), BY, ZT + 40, 70, 120, ZD - ZT - 40).color(stand));
add("gearbox", blk(0, BY, ZD + 70, 240, 200, 160).color(motor));
add("motor-body", cylZ(0, BY, ZD + 230, 280, 115, 20).color(motor));
for (let k = 0; k < 8; k++) add(`motor-fin-${k}`, box(14, 30, 240, true).translate(122, 0, 0).rotateZ(k * 45).translate(0, BY, ZD + 250 + 120).color(motor));
add("fan-cowl", cylZ(0, BY, ZD + 510, 90, 120, 20).color('#2a2d30'));
add("motor-terminal", blk(0, BY - 120, ZD + 300, 120, 70, 110).color(motor));
add("rating-plate", blk(-70, BY - 117, ZD + 120, 80, 4, 50).color('#d9dcde'));

// Water fill line up the +X side into the dome.
const FX = R + 80;
add("fill-riser", cylZ(FX, 0, 120, ZD + 40 - 120, 25, 12).color(fitting));
add("fill-elbow", cylX(R - 140, 0, ZD + 40, FX - R + 165, 25, 12).color(fitting));
add("fill-drop", cylZ(R - 140, 0, ZD - 20, 60, 25, 12).color(fitting));
add("fill-valve", blk(FX, 0, 900, 70, 70, 70).color(fitting));
add("fill-lever", blk(FX, -60, 950, 20, 100, 14).color('#2f6fa8'));
for (const z of [ZK + 200, ZT - 200]) add(`fill-clip-${z}`, blk(R + 40, 0, z, 90, 40, 30).color(stand));

// Level sight tube with graduations on the front.
const SX = -R * 0.45;
const SY = -Math.sqrt(R * R - SX * SX) - 40;
add("sight-tube", cylZ(SX, SY, ZK + 60, HC - 120, 14, 8).color('#cfd8d2'));
add("sight-level", cylZ(SX, SY, ZK + 60, (HC - 120) * 0.7, 15, 8).color('#3f8f8a'));
for (const [i, z] of [ZK + 40, ZT - 60].entries()) add(`sight-bracket-${i}`, blk(SX, SY + 25, z, 40, 60, 20).color(fitting));
for (let k = 0; k < 6; k++) add(`grad-${k}`, blk(SX + 34, SY + 8, ZK + 120 + k * (HC - 200) / 5, k % 2 === 0 ? 50 : 30, 3, 6).color('#2a2d30'));
const LY = -Math.sqrt(R * R - 60 * 60) - 4;
add("label", blk(60, LY, ZK + HC * 0.42, 300, 6, 200).color('#2a8a4a'));
add("label-band", blk(60, LY - 3, ZK + HC * 0.42 + 120, 240, 4, 30).color('#f2f2ec'));
add("label-band-2", blk(60, LY - 3, ZK + HC * 0.42 + 50, 180, 4, 30).color('#f2f2ec'));

// Bottom outlet: ball valve, elbow toward the front, camlock and hose.
add("outlet-neck", cylZ(0, 0, ZS - 140, 140, 32, 12).color(fitting));
add("outlet-valve", blk(0, 0, ZS - 230, 90, 90, 90).color(fitting));
add("outlet-lever", blk(0, -80, ZS - 160, 24, 160, 16).color('#c0392b'));
add("outlet-elbow", cylY(0, 0, ZS - 260, 160, 32, 12).color(fitting));
add("camlock", cylY(0, -160, ZS - 260, 60, 40, 12).color('#c9a43a'));
const hose: [number, number, number][] = [[0, -220, ZS - 260], [-60, -380, ZS - 330], [-220, -520, 60], [-500, -560, 30]];
for (let k = 0; k < hose.length - 1; k++) add(`hose-${k}`, rod(hose[k], hose[k + 1], 30, 10).color('#2a2d30'));

// Fertiliser sack leaning on the stand, beside the outlet.
const sack = (sh: Shape) => sh.rotateY(-8).translate(-R - 120, -R * 0.3, 40);
add("sack", sack(blk(0, 0, 0, 420, 160, 580)).color('#f2f0e6'));
add("sack-print", sack(blk(0, -82, 160, 300, 4, 220)).color('#2a8a4a'));
add("sack-fold", sack(blk(0, 0, 580, 380, 120, 60)).color('#e3dcc2'));
add("sack-pallet", blk(-R - 120, -R * 0.3, 0, 480, 220, 30).color('#b08a5a'));

return p.model();
