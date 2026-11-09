// SPDX-License-Identifier: CC0-1.0
// Stock solution tank: the concentrate tanks that hold the A and B nutrient
// stocks (kept apart so calcium and sulphate do not precipitate) for a
// fertigation dosing unit, shown standing in a spill bund.
// What makes it a stock tank: an upright moulded polyethylene tank with
// stiffening ribs and a domed top, a wide screw lid, an electric stirrer
// motor on the lid to keep the concentrate mixed, a clear level sight tube
// with graduations on the front, a bottom bulkhead outlet with a ball valve
// feeding the dosing line, and a big A or B label so the two are never mixed.
// Generic visualization geometry at about real size (about 500 L, 800 mm
// across), millimetres, Z up, front toward -Y.

meta({
  name: "stock-solution-tank",
  license: 'CC0-1.0',
  title: "Stock solution tank",
  description: "Nutrient concentrate tank at about real size: ribbed upright polyethylene tank with domed top, wide screw lid, lid-mounted stirrer motor, front level sight tube with graduations, bottom bulkhead outlet with ball valve and PVC line to the dosing header, and a large A or B label; single tank or an A/B pair in a steel spill bund. Material controls: tank, lid and stirrer, bund and stand, PVC fittings. naturalPoly, blackPoly, bluePoly and weathered presets.",
  tags: ['stock solution tank', 'concentrate tank', 'nutrient tank', 'a b tank', 'fertigation', 'dosing', 'mixing', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tank = param('tank', '#e4dfcc', { label: 'Tank (natural polyethylene)' });
const lid = param('lid', '#2f6fa8', { label: 'Lid and stirrer (polymer)' });
const bund = param('bund', '#3d4347', { label: 'Spill bund (powder-coated steel)' });
const fitting = param('fitting', '#8e9497', { label: 'Fittings and pipe (PVC)' });
const count = param('tanks', 'A/B pair', { choices: ['single', 'A/B pair'], label: 'Tanks' });

presets({
  naturalPoly: { tank: '#e4dfcc', lid: '#2f6fa8', bund: '#3d4347', fitting: '#8e9497' },
  blackPoly: { tank: '#2a2d30', lid: '#c0392b', bund: '#5a6066', fitting: '#8e9497' },
  bluePoly: { tank: '#3a73a8', lid: '#e6e6e0', bund: '#3d4347', fitting: '#dcdcd4' },
  weathered: { tank: '#c9c1a2', lid: '#4f6a80', bund: '#5c5a52', fitting: '#a9a99c' },
});

const p = assembly("stock-solution-tank");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const turned = (pts: [number, number][], seg = 24) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};

const R = 400; // tank radius
const H = 1050; // shell height to the shoulder
const ZT = 90; // tank sits on the bund floor grating
const ZO = ZT + 130; // outlet and dosing header height
const pair = count.value === 'A/B pair';
const tanks: [number, string, string][] = pair ? [[-470, 'A', '#2a8a4a'], [470, 'B', '#c0392b']] : [[0, 'A', '#2a8a4a']];

// Spill bund: floor, low walls and a grating the tanks stand on.
const BW = pair ? 1960 : 1000;
const BD = 1400;
add("bund-floor", blk(0, 0, 0, BW, BD, 20).color(bund));
add("bund-wall-front", blk(0, -BD / 2 + 10, 20, BW, 20, 150).color(bund));
add("bund-wall-back", blk(0, BD / 2 - 10, 20, BW, 20, 150).color(bund));
add("bund-wall-left", blk(-BW / 2 + 10, 0, 20, 20, BD, 150).color(bund));
add("bund-wall-right", blk(BW / 2 - 10, 0, 20, 20, BD, 150).color(bund));
for (let k = 0; k < (pair ? 9 : 5); k++) add(`grating-${k}`, blk(-BW / 2 + 110 + k * 220, 0, 20, 40, BD - 60, 70).color('#5a6066'));
add("grating-deck", blk(0, 0, 80, BW - 60, BD - 60, 10).color('#5a6066'));
add("bund-warning-stripe", blk(0, -BD / 2 - 1, 120, BW - 40, 3, 30).color('#e0a21c'));

for (const [x, letter, mark] of tanks) {
  const t = `tank-${letter.toLowerCase()}`;
  // Shell with a chamfered base and domed top, revolved.
  add(`${t}-shell`, turned([
    [0, ZT], [R - 30, ZT], [R, ZT + 30], [R, ZT + H], [R - 60, ZT + H + 90], [R - 170, ZT + H + 150], [210, ZT + H + 170], [0, ZT + H + 170],
  ]).translate(x, 0, 0).color(tank));
  for (const [i, z] of [0.25, 0.5, 0.75].entries()) add(`${t}-rib-${i}`, cylZ(x, 0, ZT + H * z, 30, R + 10, 24).color(tank));
  // Screw lid with grip lugs.
  const ZL = ZT + H + 170;
  add(`${t}-lid`, cylZ(x + 120, 0, ZL - 10, 60, 190, 20).color(lid));
  for (let k = 0; k < 8; k++) add(`${t}-lid-lug-${k}`, box(30, 24, 50, true).translate(190, 0, 0).rotateZ(k * 45).translate(x + 120, 0, ZL + 20).color(lid));
  // Stirrer motor on a bracket, shaft into the tank.
  add(`${t}-stirrer-plate`, blk(x + 120, 0, ZL + 50, 220, 160, 20).color(lid));
  add(`${t}-stirrer-motor`, cylZ(x + 120, 0, ZL + 70, 220, 70, 16).color(lid));
  add(`${t}-stirrer-fan-cap`, cylZ(x + 120, 0, ZL + 290, 30, 74, 16).color('#2a2d30'));
  add(`${t}-stirrer-box`, blk(x + 120, -80, ZL + 140, 80, 30, 80).color('#2a2d30'));
  // Breather vent on the dome.
  add(`${t}-vent`, cylZ(x - 200, 0, ZT + H + 120, 50, 26, 8).color(fitting));
  add(`${t}-vent-cap`, cylZ(x - 200, 0, ZT + H + 170, 16, 40, 8).color(fitting));
  // Front level sight tube with graduation marks.
  const SX = x - 200;
  const SY = -Math.sqrt(R * R - 200 * 200) - 40;
  add(`${t}-sight-tube`, cylZ(SX, SY, ZT + 120, H - 180, 14, 8).color('#cfd8d2'));
  add(`${t}-sight-level`, cylZ(SX, SY, ZT + 120, (H - 180) * 0.62, 15, 8).color(mark));
  for (const [i, z] of [ZT + 100, ZT + H - 70].entries()) {
    add(`${t}-sight-bracket-${i}`, blk(SX, SY + 20, z, 40, 50, 20).color(fitting));
  }
  for (let k = 0; k < 6; k++) add(`${t}-grad-${k}`, blk(SX + 30, SY + 6, ZT + 160 + k * 140, k % 2 === 0 ? 50 : 30, 3, 6).color('#2a2d30'));
  // Big A/B label.
  const LY = -Math.sqrt(R * R - 40 * 40) - 4;
  add(`${t}-label-panel`, blk(x + 60, LY, ZT + 420, 260, 6, 300).color(mark));
  if (letter === 'A') {
    add(`${t}-letter-l`, box(40, 4, 230, true).rotateY(16).translate(x + 28, LY - 4, ZT + 570).color('#f2f2ec'));
    add(`${t}-letter-r`, box(40, 4, 230, true).rotateY(-16).translate(x + 92, LY - 4, ZT + 570).color('#f2f2ec'));
    add(`${t}-letter-bar`, blk(x + 60, LY - 4, ZT + 530, 80, 4, 30).color('#f2f2ec'));
  } else {
    add(`${t}-letter-stem`, blk(x + 20, LY - 4, ZT + 455, 40, 4, 230).color('#f2f2ec'));
    for (const z of [ZT + 455, ZT + 555, ZT + 655]) add(`${t}-letter-bar-${z}`, blk(x + 60, LY - 4, z, 80, 4, 30).color('#f2f2ec'));
    for (const z of [ZT + 485, ZT + 585]) add(`${t}-letter-bowl-${z}`, blk(x + 100, LY - 4, z, 40, 4, 70).color('#f2f2ec'));
  }
  // Bottom bulkhead outlet, ball valve and drop to the dosing header.
  const OY = -R - 20;
  add(`${t}-bulkhead`, cylY(x + 150, -R + 30, ZO, 70, 40, 10).color(fitting));
  add(`${t}-outlet-nipple`, cylY(x + 150, -R - 40, ZO, 60, 22, 10).color(fitting));
  add(`${t}-valve-body`, cylY(x + 150, OY - 70, ZO, 70, 34, 10).color(fitting));
  add(`${t}-valve-handle`, blk(x + 190, OY - 105, ZO + 40, 110, 18, 14).color(mark));
  add(`${t}-outlet-run`, cylY(x + 150, OY - 140, ZO, 50, 22, 10).color(fitting));
}

// Dosing header along the front of the bund.
const HY = -R - 210;
add("dosing-header", cylX(-BW / 2 + 40, HY, ZO, BW - 80, 24).color(fitting));
for (const [x] of tanks) add(`header-tee-${x}`, cylX(x + 110, HY, ZO, 80, 30).color(fitting));
add("header-cap", cylX(-BW / 2 + 30, HY, ZO, 20, 30).color(fitting));
add("header-to-doser", cylZ(BW / 2 - 60, HY, ZO - 20, 400, 24).color(fitting));
add("header-elbow", cylX(BW / 2 - 90, HY, ZO, 60, 30).color(fitting));

return p.model();
