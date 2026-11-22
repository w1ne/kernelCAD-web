// SPDX-License-Identifier: CC0-1.0
// Can densifier: the hydraulic press that turns loose aluminium or steel
// cans into dense, stackable "biscuits" for the smelter. What makes it that
// machine rather than a crate: a cleated incline conveyor carrying loose cans
// up into a flared feed hopper, a long horizontal press box on legs with a
// main ram cylinder at its far end and a side ejection cylinder, a discharge
// door on the front with a roller table carrying a stack of pressed
// biscuits, a hydraulic power pack under the press, and an operator panel.
// Generic visualization geometry at about real size (press 2.6 m long,
// 2.6 m to the hopper rim), millimetres, Z up, discharge on -Y and the
// conveyor foot on -X.

meta({
  name: "can-densifier",
  license: 'CC0-1.0',
  title: "Can densifier",
  description: "Hydraulic can densifier at about real size: cleated incline infeed conveyor with loose cans, flared feed hopper, horizontal press box on legs with main ram and ejection cylinders, front discharge door and roller table with a stack of pressed can biscuits, hydraulic power pack and operator panel. Material controls: machine paint, hopper and guards, machined steel and can metal. aluminium, weathered, steelCans and highVisibility presets.",
  tags: ["recycling", "can densifier", "can crusher", "aluminium", "ubc", "hydraulic press", "biscuit", "conveyor", "materials recovery", "waste management", "metals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#766078', { label: 'Press body (paint)' });
const guards = param('guards', '#e2a72a', { label: 'Hopper, guards and conveyor (paint)' });
const steel = param('steel', '#c4c9cb', { label: 'Cylinder rods, rollers and fittings (steel)' });
const cans = param('cans', '#b9c2c8', { label: 'Cans and biscuits (metal)' });
const output = param('output', 'stacked', { choices: ['stacked', 'empty'], label: 'Biscuits on the roller table' });

presets({
  aluminium: { body: '#766078', guards: '#e2a72a', steel: '#c4c9cb', cans: '#b9c2c8' },
  weathered: { body: '#5f5560', guards: '#b48c3e', steel: '#9ea4a4', cans: '#9aa2a4' },
  steelCans: { body: '#2f5d9a', guards: '#d9d9d4', steel: '#c4c9cb', cans: '#8a8378' },
  highVisibility: { body: '#2b2f33', guards: '#ffd044', steel: '#d0d4d6', cans: '#c9d2d8' },
});

const p = assembly("can-densifier");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const barXZ = (x0: number, z0: number, x1: number, z1: number, y: number, d: number, t: number) => {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(len, d, t, true).rotateY(-a).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const dark = '#2b2f33';

// Press box on four legs, with the press chamber running along X.
const PX0 = 0, PX1 = 2600, PZ0 = 600, PZ1 = 1500, PD = 1000;
for (const x of [PX0 + 120, PX1 - 120]) for (const y of [-PD / 2 + 80, PD / 2 - 80]) {
  add(`leg-${x > 1000 ? 'r' : 'l'}-${y > 0 ? 'b' : 'f'}`, blk(x, y, 0, 140, 140, PZ0).color(body));
  add(`foot-${x > 1000 ? 'r' : 'l'}-${y > 0 ? 'b' : 'f'}`, blk(x, y, 0, 240, 240, 20).color(dark));
}
add("press-box", blk((PX0 + PX1) / 2, 0, PZ0, PX1 - PX0, PD, PZ1 - PZ0).color(body));
for (const x of [500, 1100, 1700]) add(`stiffener-${x}`, blk(x, 0, PZ0 - 10, 80, PD + 40, PZ1 - PZ0 + 20).color(body));
add("ram-housing", blk(PX1 + 250, 0, PZ0 + 150, 500, 700, 600).color(body));
add("main-cylinder", cylinder(1300, 170, 16).rotateY(90).translate(PX1 + 500, 0, PZ0 + 450).color(body));
add("main-cylinder-cap", cylinder(90, 210, 16).rotateY(90).translate(PX1 + 1800, 0, PZ0 + 450).color(dark));
add("main-cylinder-gland", cylinder(80, 210, 16).rotateY(90).translate(PX1 + 500, 0, PZ0 + 450).color(dark));
for (const y of [-150, 150]) add(`tie-rod-${y > 0 ? 'b' : 'f'}`, cylinder(1320, 22, 8).rotateY(90).translate(PX1 + 500, y, PZ0 + 680).color(steel));

// Flared feed hopper over the chamber.
const HX = 900, HZ = PZ1, HH = 1100;
add("hopper", rect(700, 640).loft([rect(1300, 1100), rect(1360, 1160)], {
  planes: [HZ, HZ + HH - 80, HZ + HH].map((z) => ({ plane: 'XY' as const, origin: [HX, 0, z] as [number, number, number] })),
  ruled: true,
}).color(guards));
add("hopper-rim", blk(HX, 0, HZ + HH, 1400, 1200, 40).subtract(blk(HX, 0, HZ + HH - 10, 1240, 1040, 60)).color(dark));
add("can-heap", sphere(560).scale([1, 0.85, 0.28]).translate(HX, 0, HZ + HH).color(cans));
for (let k = 0; k < 7; k++) {
  const a = k * 51;
  add(`loose-can-${k}`, cylinder(120, 33, 10).rotateY(90).rotateZ(a).translate(HX - 300 + (k % 4) * 190, -260 + (k % 3) * 220, HZ + HH + 110 + (k % 2) * 30)
    .color(k % 3 === 0 ? '#c8322a' : k % 3 === 1 ? '#2f5d9a' : cans));
}

// Cleated incline infeed conveyor from the floor on -X up to the hopper.
const CX0 = -2900, CZ0 = 450, CX1 = HX - 450, CZ1 = HZ + HH + 250, BW = 620;
const cAng = Math.atan2(CZ1 - CZ0, CX1 - CX0);
add("belt", barXZ(CX0, CZ0, CX1, CZ1, 0, BW, 40).color(dark));
for (const y of [-BW / 2 - 30, BW / 2 + 30]) add(`conveyor-side-${y > 0 ? 'b' : 'f'}`, barXZ(CX0, CZ0 + 60, CX1, CZ1 + 60, y, 30, 260).color(guards));
add("head-pulley", cylinder(BW + 40, 110, 14).rotateX(90).translate(CX1, BW / 2 + 20, CZ1 - 40).color(steel));
add("tail-pulley", cylinder(BW + 40, 110, 14).rotateX(90).translate(CX0, BW / 2 + 20, CZ0 - 40).color(steel));
add("conveyor-drive", cylinder(260, 120, 12).rotateX(90).translate(CX1, BW / 2 + 300, CZ1 - 40).color(body));
for (let k = 1; k <= 9; k++) {
  const t = k / 10;
  const x = CX0 + t * (CX1 - CX0), z = CZ0 + t * (CZ1 - CZ0);
  add(`cleat-${k}`, box(30, BW - 40, 90, true).rotateY(-(cAng * 180) / Math.PI).translate(x - Math.sin(cAng) * 60, 0, z + Math.cos(cAng) * 60).color(dark));
  if (k % 2 === 1 && k < 9) {
    add(`belt-can-${k}`, cylinder(120, 33, 10).rotateX(90).translate(x + 90, 60 + (k % 3) * 60 - 120, z + 130).color(k === 3 ? '#c8322a' : cans));
  }
}
for (const t of [0.3, 0.65]) {
  const x = CX0 + t * (CX1 - CX0), z = CZ0 + t * (CZ1 - CZ0);
  for (const y of [-BW / 2 - 30, BW / 2 + 30]) add(`conveyor-leg-${t}-${y > 0 ? 'b' : 'f'}`.replace('.', 'p'), blk(x, y, 0, 70, 70, z - 40).color(guards));
}
add("feed-trough", blk(CX0 - 150, 0, 0, 700, BW + 200, CZ0 + 200).subtract(blk(CX0 - 150, 0, CZ0 + 20, 640, BW + 140, 400)).color(guards));

// Discharge door and roller table on the front (-Y).
const DX = 1900;
add("discharge-door", blk(DX, -PD / 2 - 30, PZ0 + 80, 520, 60, 600).color(guards));
add("door-cylinder", cylinder(600, 70, 12).translate(DX + 340, -PD / 2 - 60, PZ1).color(body));
add("door-cylinder-rod", cylinder(250, 28, 8).translate(DX + 340, -PD / 2 - 60, PZ1 - 250).color(steel));
const TY0 = -PD / 2 - 80, TL = 1700, TZ = PZ0 + 40;
for (const x of [DX - 330, DX + 330]) {
  add(`table-rail-${x > DX ? 'r' : 'l'}`, blk(x, TY0 - TL / 2, TZ - 80, 60, TL, 80).color(body));
  add(`table-leg-${x > DX ? 'r' : 'l'}`, blk(x, TY0 - TL + 60, 0, 60, 60, TZ - 80).color(body));
}
for (let k = 0; k < 9; k++) add(`roller-${k}`, cylinder(600, 35, 10).rotateY(90).translate(DX - 300, TY0 - 80 - k * 190, TZ - 30).color(steel));
if (output.value === 'stacked') {
  for (let k = 0; k < 6; k++) {
    const y = TY0 - 260 - Math.floor(k / 2) * 420, z = TZ + 5 + (k % 2) * 200;
    add(`biscuit-${k}`, blk(DX, y, z, 300, 360, 195).color(cans));
    add(`biscuit-band-${k}`, blk(DX, y, z + 70, 306, 366, 30).color(k % 3 === 0 ? '#c8322a' : '#8f979c'));
  }
}

// Hydraulic power pack under the press and the operator panel.
add("oil-tank", blk(1500, 120, 40, 900, 600, 420).color(body));
add("pump-motor", cylinder(500, 150, 14).rotateY(90).translate(300, 80, 260).color('#3d4f63'));
add("motor-fan-cover", cylinder(60, 160, 14).rotateY(90).translate(240, 80, 260).color(dark));
add("valve-block", blk(1100, -180, 460, 300, 200, 120).color(steel));
add("operator-panel", blk(400, -PD / 2 - 110, 900, 500, 160, 650).color('#d9d9d4'));
add("panel-screen", blk(400, -PD / 2 - 194, 1260, 300, 10, 200).color('#3f6e8a'));
add("button-stop", cylinder(30, 45, 10).rotateX(90).translate(250, -PD / 2 - 190, 1080).color('#d62f2a'));
add("button-start", cylinder(30, 32, 10).rotateX(90).translate(400, -PD / 2 - 190, 1080).color('#2f9a4f'));
add("beacon", cylinder(160, 55, 10).translate(PX1 - 100, -PD / 2 + 120, PZ1).color('#f08a24'));

return p.model();
