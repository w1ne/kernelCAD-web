// SPDX-License-Identifier: CC0-1.0
// Plastic-film compactor: the horizontal screw (auger) compactor that eats
// loose stretch wrap and carrier bags and pushes them out as a dense, endless
// plug of film. What makes it that machine rather than a box: a big open
// hopper whose screw flights show at the bottom of the throat, a heavy
// gearmotor driving the screw from the back end, a ribbed barrel with
// bolted flanges that narrows into a conical discharge nozzle, the
// compressed film plug curving out of the nozzle into a wheeled roll cage,
// loose film spilling over the hopper rim, and a control box with an
// emergency stop on the stand.
// Generic visualization geometry at about real size (4.6 m overall, hopper
// rim at 2.3 m), millimetres, Z up, drive on -X and discharge toward +X.

meta({
  name: "plastic-film-compactor",
  license: 'CC0-1.0',
  title: "Plastic-film compactor",
  description: "Horizontal screw compactor for plastic film at about real size: open hopper with screw flights visible in the throat, gearmotor drive, ribbed barrel with bolted flanges and conical discharge nozzle, compressed film plug curving into a wheeled roll cage, loose film on the hopper rim and a control box with emergency stop. Material controls: frame paint, hopper and barrel steel, drive paint and plastic film. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "compactor", "screw compactor", "auger", "plastic film", "stretch wrap", "ldpe", "roll cage", "materials recovery", "waste management", "plastics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#5f7380', { label: 'Stand and roll cage (paint)' });
const hopper = param('hopper', '#b8bec0', { label: 'Hopper and barrel (steel)' });
const drive = param('drive', '#2f5d9a', { label: 'Gearmotor (paint)' });
const film = param('film', '#e4eaee', { label: 'Plastic film' });
const cage = param('cage', 'filling', { choices: ['filling', 'empty'], label: 'Roll cage' });

presets({
  plant: { frame: '#5f7380', hopper: '#b8bec0', drive: '#2f5d9a', film: '#e4eaee' },
  weathered: { frame: '#5a5f5c', hopper: '#9ea4a4', drive: '#4a5a6a', film: '#d4d6cc' },
  stainless: { frame: '#c4c9cb', hopper: '#d6dadb', drive: '#2b2f33', film: '#e4eaee' },
  highVisibility: { frame: '#f0c419', hopper: '#b8bec0', drive: '#c8322a', film: '#b9dcef' },
});

const p = assembly("plastic-film-compactor");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const loftXY = (sections: [number, number, number][], x: number) => rect(sections[0][1], sections[0][2]).loft(sections.slice(1).map(([, w, d]) => rect(w, d)), {
  planes: sections.map(([z]) => ({ plane: 'XY' as const, origin: [x, 0, z] as [number, number, number] })),
  ruled: true,
});
const ngon = (r: number, n: number) => {
  let q = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) q = q.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return q.close();
};
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 10) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const dark = '#2b2f33';

const AZ = 900, R = 300; // screw axis height and barrel radius
const HX = -200, HZ0 = AZ + 100, HZ1 = 2300; // hopper centre and heights
const BX1 = 2100, NX = 2700; // barrel end and nozzle tip

// Stand: two portal legs and a base frame.
for (const x of [-900, 300, 1700]) {
  for (const y of [-450, 450]) add(`leg-${x + 900}-${y > 0 ? 'b' : 'f'}`, blk(x, y, 0, 120, 120, AZ - R).color(frame));
  add(`leg-beam-${x + 900}`, blk(x, 0, AZ - R - 120, 160, 1020, 120).color(frame));
}
for (const y of [-450, 450]) add(`base-rail-${y > 0 ? 'b' : 'f'}`, blk(400, y, 0, 2800, 100, 100).color(frame));

// Open hopper over the screw throat.
add("hopper", loftXY([[HZ0, 1000, 620], [HZ1 - 60, 1700, 1500], [HZ1, 1760, 1560]], HX)
  .subtract(loftXY([[HZ0 - 10, 900, 540], [HZ1 - 60, 1600, 1420], [HZ1 + 10, 1640, 1460]], HX)).color(hopper));
add("hopper-rim", blk(HX, 0, HZ1, 1800, 1600, 30).subtract(blk(HX, 0, HZ1 - 10, 1640, 1460, 50)).color(frame));
add("throat", blk(HX, 0, AZ - R + 40, 1060, 680, HZ0 - AZ + R - 40).subtract(blk(HX, 0, AZ - R + 100, 960, 560, 2000)).color(hopper));

// Screw: shaft plus tilted flight discs, visible in the throat.
add("screw-shaft", cylinder(BX1 - HX + 500, 80, 12).rotateY(90).translate(HX - 600, 0, AZ).color(dark));
for (let k = 0; k < 6; k++) {
  add(`flight-${k}`, cylinder(20, R - 30, 16).rotateY(90).rotateZ(14).translate(HX - 420 + k * 170, 0, AZ).color('#8f979c'));
}

// Barrel with flanges, ribs and the conical discharge nozzle.
add("barrel", cylinder(BX1 - (HX + 520), R, 18).rotateY(90).translate(HX + 520, 0, AZ).color(hopper));
for (const x of [HX + 520, 1300, BX1]) add(`flange-${x}`, cylinder(50, R + 60, 18).rotateY(90).translate(x - 25, 0, AZ).color(frame));
for (const y of [-R - 10, R + 10]) add(`barrel-rib-${y > 0 ? 'b' : 'f'}`, blk((HX + 520 + BX1) / 2, y, AZ - 40, BX1 - HX - 520, 40, 80).color(frame));
add("nozzle", ngon(R, 18).loft([ngon(190, 18)], {
  planes: [0, NX - BX1].map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
  ruled: true,
}).rotateY(90).translate(BX1, 0, AZ).color(hopper));
add("back-pressure-plate", blk(NX - 80, 0, AZ + 200, 60, 420, 260).color(drive));
add("back-pressure-cylinder", cylinder(500, 50, 10).rotateY(90).translate(NX - 600, 0, AZ + 380).color(dark));

// Gearmotor on the -X end.
add("gearbox", blk(HX - 820, 0, AZ - 380, 420, 640, 700).color(drive));
add("gearbox-flange", cylinder(40, 260, 16).rotateY(90).translate(HX - 610, 0, AZ).color(drive));
add("motor", cylinder(560, 200, 16).rotateX(90).translate(HX - 820, -320, AZ + 120).color(drive));
add("motor-fan-cover", cylinder(60, 210, 16).rotateX(90).translate(HX - 820, -880, AZ + 120).color(dark));
add("motor-terminal-box", blk(HX - 820, -620, AZ + 320, 200, 200, 140).color(drive));
add("drive-guard", blk(HX - 1060, 0, AZ - 380, 60, 640, 700).color('#f0c419'));

// Compressed film plug leaving the nozzle and curving into the roll cage.
const filling = cage.value === 'filling';
const CX = NX + 700, CW = 1100, CD = 900, CH = 1700;
if (filling) {
  add("film-plug", cylinder(500, 180, 14).rotateY(90).translate(NX, 0, AZ).color(film));
  add("film-plug-elbow", sphere(180).translate(NX + 420, 0, AZ).color(film));
  add("film-plug-drop", rod([NX + 420, 0, AZ], [CX - 100, 0, 600], 175, 14).color(film));
  add("film-pile", sphere(480).scale([1, 0.8, 0.9]).translate(CX + 50, 0, 520).color(film));
  for (let k = 0; k < 4; k++) add(`film-bag-${k}`, sphere(160).scale([1.2, 1, 0.7]).translate(CX - 250 + k * 170, -230 + (k % 2) * 300, 800 + (k % 2) * 80).color(['#e58aa8', '#7fb8d8', film, '#9ccf8a'][k]));
}
add("cage-base", blk(CX, 0, 120, CW, CD, 60).color(frame));
for (const x of [CX - CW / 2 + 30, CX + CW / 2 - 30]) for (const y of [-CD / 2 + 30, CD / 2 - 30]) {
  add(`cage-post-${x > CX ? 'r' : 'l'}-${y > 0 ? 'b' : 'f'}`, blk(x, y, 180, 40, 40, CH).color(frame));
  add(`cage-wheel-${x > CX ? 'r' : 'l'}-${y > 0 ? 'b' : 'f'}`, cylinder(40, 60, 12).rotateX(90).translate(x, y + 20, 60).color(dark));
}
for (const z of [700, 1300, CH + 160]) add(`cage-hoop-${z}`, blk(CX, 0, z, CW, CD, 30).subtract(blk(CX, 0, z - 10, CW - 60, CD - 60, 50)).color(frame));
for (let k = 1; k < 6; k++) {
  add(`cage-bar-back-${k}`, blk(CX - CW / 2 + (k * CW) / 6, CD / 2 - 15, 180, 16, 16, CH).color(frame));
  add(`cage-bar-right-${k}`, blk(CX + CW / 2 - 15, -CD / 2 + (k * CD) / 6, 180, 16, 16, CH).color(frame));
}

// Loose film spilling over the hopper rim.
for (let k = 0; k < 5; k++) {
  add(`loose-film-${k}`, sphere(240).scale([1.3, 1, 0.6]).translate(HX - 450 + k * 230, -300 + (k % 3) * 260, HZ1 - 60 + (k % 2) * 60)
    .color(k === 1 ? '#e58aa8' : k === 3 ? '#7fb8d8' : film));
}

// Control box with emergency stop on the stand.
add("control-post", blk(300, -560, 0, 80, 80, 1300).color(frame));
add("control-box", blk(300, -640, 1050, 420, 180, 520).color('#d9d9d4'));
add("estop", cylinder(30, 50, 10).rotateX(90).translate(420, -730, 1450).color('#d62f2a'));
add("button-start", cylinder(25, 30, 10).rotateX(90).translate(200, -730, 1450).color('#2f9a4f'));
add("hour-meter", blk(300, -735, 1200, 160, 10, 100).color(dark));

return p.model();
