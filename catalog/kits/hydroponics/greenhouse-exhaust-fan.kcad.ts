// SPDX-License-Identifier: CC0-1.0
// Greenhouse exhaust fan: the big square box fan set into a greenhouse end
// wall that pulls hot, humid air out of the house, paired with cooling pads
// on the opposite wall.
// What makes it a greenhouse box fan: a deep square galvanised housing with a
// flanged front, a round venturi ring around the propeller, a square wire
// guard over the intake face, broad pitched propeller blades on a hub, a
// belt drive from a motor in the top corner to a big hub pulley on a rear
// spider bracket, gravity shutter slats on the exhaust face, and a junction
// box with conduit on top. Here it stands on a skid frame, ready to set into
// the wall opening.
// Generic visualization geometry at about real size (1.38 m square housing,
// 50-inch propeller), millimetres, Z up, intake face toward -Y.

meta({
  name: "greenhouse-exhaust-fan",
  license: 'CC0-1.0',
  title: "Greenhouse exhaust fan",
  description: "Greenhouse box exhaust fan at about real size: deep square galvanised housing with a flanged front and round venturi ring, square wire intake guard, pitched propeller blades on a hub, belt drive from a corner motor to a hub pulley on a rear spider bracket, gravity shutter slats on the exhaust face, junction box and conduit, on a skid frame. Material controls: housing, propeller blades, wire guard and motor, plus a blade count choice. galvanised, whiteHousing, blackGuard and weathered presets.",
  tags: ['exhaust fan', 'box fan', 'greenhouse fan', 'ventilation fan', 'belt drive fan', 'shutter fan', 'wall fan', 'cooling', 'ventilation', 'hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#b8bec2', { label: 'Housing (galvanised steel)' });
const blades = param('blades', '#d6dadc', { label: 'Propeller blades (aluminium)' });
const guard = param('guard', '#5d6367', { label: 'Wire guard (zinc-plated steel)' });
const motor = param('motor', '#2f6fa8', { label: 'Motor (painted cast iron)' });
const bladeCount = param('bladeCount', '6', { choices: ['3', '6'], label: 'Propeller blades' });

presets({
  galvanised: { housing: '#b8bec2', blades: '#d6dadc', guard: '#5d6367', motor: '#2f6fa8' },
  whiteHousing: { housing: '#ecece6', blades: '#c9ced2', guard: '#5d6367', motor: '#3f7f4a' },
  blackGuard: { housing: '#b8bec2', blades: '#e6e8ea', guard: '#202325', motor: '#c0392b' },
  weathered: { housing: '#8f938c', blades: '#a9aca6', guard: '#5b5146', motor: '#4f6070' },
});

const p = assembly("greenhouse-exhaust-fan");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Cylinder along +Y starting at y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateX(90).translate(x, y + len, z);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);

const S = 1380, D = 420; // housing square and depth
const ZB = 160; // housing underside on the skids
const ZC = ZB + S / 2; // propeller axis height
const R = 640; // venturi radius

// Skid frame the fan stands on.
for (const x of [-S / 2 + 120, S / 2 - 120]) {
  add(`skid-${x}`, blk(x, 0, 0, 80, D + 260, 60).color(guard));
  add(`skid-post-f-${x}`, blk(x, -D / 2 + 40, 60, 60, 60, ZB - 60).color(guard));
  add(`skid-post-b-${x}`, blk(x, D / 2 - 40, 60, 60, 60, ZB - 60).color(guard));
}

// Housing: deep square tube, flanged front panel with the venturi opening.
add("housing-shell", blk(0, 0, ZB, S, D, S).subtract(blk(0, 0, ZB + 20, S - 40, D + 40, S - 40)).color(housing));
add("front-panel", blk(0, -D / 2 + 10, ZB, S, 20, S).subtract(cylY(0, -D / 2 - 10, ZC, 60, R, 40)).color(housing));
add("front-flange", blk(0, -D / 2 - 4, ZB - 40, S + 80, 12, S + 80).subtract(blk(0, -D / 2 - 4, ZB + 20, S - 40, 40, S - 40)).color(housing));
add("venturi-ring", cylY(0, -D / 2, ZC, 220, R + 8, 40).subtract(cylY(0, -D / 2 - 10, ZC, 240, R, 40)).color(housing));
for (const sx of [-1, 1]) {
  for (const sz of [-1, 1]) add(`corner-gusset-${sx}-${sz}`, blk(sx * (S / 2 - 90), -D / 2 - 12, ZC + sz * (S / 2 - 90) - 40, 80, 6, 80).color('#9aa0a4'));
}

// Propeller: pitched paddle blades on a hub.
const n = Number(bladeCount.value);
const BY = -60; // blade plane
const paddle = extrudePolygon([[-60, 150], [60, 150], [150, 480], [130, 590], [-40, 610], [-120, 520]], 6).rotateX(90);
for (let k = 0; k < n; k++) {
  const wide = n === 3 ? 1.35 : 1;
  add(`blade-${k}`, paddle.scale([wide, 1, 1]).rotateZ(24).rotateY(k * 360 / n + 15).translate(0, BY, ZC).color(blades));
}
add("hub", cylY(0, BY - 60, ZC, 120, 150, 16).color(blades));
add("hub-cap", cylY(0, BY - 80, ZC, 20, 90, 14).color('#8c9296'));

// Belt drive on a rear spider bracket.
const RY = 140;
for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  const len = Math.hypot(S / 2 - 40, S / 2 - 40);
  add(`spider-arm-${sx}-${sz}`, box(len, 40, 40, true).rotateY(sx * sz > 0 ? -45 : 45).translate(sx * (S / 4 - 10), RY, ZC + sz * (S / 4 - 10)).color(housing));
}
add("bearing-block", blk(0, RY - 10, ZC - 70, 140, 80, 140).color('#4a4f53'));
add("hub-pulley", cylY(0, RY - 70, ZC, 30, 230, 24).color('#8c9296'));
add("drive-shaft", cylY(0, BY, ZC, RY - BY, 22, 10).color('#8c9296'));
const MX = S / 2 - 200, MZ = ZB + S - 230;
add("motor-body", cylY(MX, RY - 120, MZ, 260, 105, 16).color(motor));
add("motor-fins", cylY(MX, RY - 40, MZ, 120, 112, 12).color(motor));
add("motor-mount", blk(MX, RY + 10, MZ - 130, 220, 160, 30).color('#4a4f53'));
add("motor-pulley", cylY(MX, RY - 70, MZ, 30, 55, 12).color('#8c9296'));
const bdx = 0 - MX, bdz = ZC - MZ;
const blen = Math.hypot(bdx, bdz), bang = Math.atan2(bdz, bdx) * 180 / Math.PI;
for (const off of [-1, 1]) {
  add(`belt-${off > 0 ? 'a' : 'b'}`, box(blen, 16, 14, true).rotateY(-bang).translate(MX / 2 - off * 120 * Math.sin(bang * Math.PI / 180), RY - 55, (MZ + ZC) / 2 + off * 120 * Math.cos(bang * Math.PI / 180)).color('#1d2023'));
}

// Gravity shutter slats on the exhaust face.
for (let i = 0; i < 9; i++) {
  add(`shutter-${i}`, box(S - 60, 150, 4, true).rotateX(-62).translate(0, D / 2 - 40, ZB + 100 + i * 145).color('#dfe2e4'));
}
add("shutter-link", blk(-S / 2 + 90, D / 2 - 10, ZB + 80, 20, 12, S - 160).color(guard));

// Square wire intake guard.
const GY = -D / 2 - 26;
for (let i = 0; i < 12; i++) {
  const o = -S / 2 + 70 + i * ((S - 140) / 11);
  add(`guard-v-${i}`, blk(o, GY, ZB + 50, 8, 8, S - 100).color(guard));
  add(`guard-h-${i}`, blk(0, GY - 9, ZB + 50 + i * ((S - 100) / 11), S - 100, 8, 8).color(guard));
}
for (const sx of [-1, 1]) add(`guard-clip-${sx}`, blk(sx * (S / 2 - 30), GY + 10, ZC - 40, 40, 30, 80).color(guard));

// Junction box and conduit on the housing roof.
add("junction-box", blk(S / 2 - 220, 60, ZB + S, 160, 120, 110).color('#d8d8d0'));
add("conduit", cylZ(S / 2 - 160, 60, ZB + S + 110, 90, 16, 8).color('#5a5f63'));
add("conduit-run", cylY(S / 2 - 160, 60, ZB + S + 190, 360, 16, 8).color('#5a5f63'));
add("rating-plate", blk(-S / 2 + 220, -D / 2 - 11, ZB + S - 120, 200, 2, 90).color('#e8d85a'));

return p.model();
