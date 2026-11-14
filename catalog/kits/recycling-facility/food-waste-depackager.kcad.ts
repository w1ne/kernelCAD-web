// SPDX-License-Identifier: CC0-1.0
// Food-waste depackager: the machine that takes packaged food waste (out-of-
// date supermarket stock, catering bins) and separates the food from its
// packaging so the food can go to an anaerobic digester. A fast hammer rotor
// inside a round-topped housing bursts the packs; the food leaves as a pumped
// slurry and the cleaned packaging is screwed out the other end. What makes
// it that machine rather than a tank: a big stainless body with a drum-shaped
// rotor housing and feed hopper on top, a bin lifter with a wheelie bin of
// food waste (lowered on the floor, or tipping into the hopper), a belt-guarded
// rotor motor on the end, an inclined packaging screw dropping film and
// bottles into a skip, and a slurry pump piped to an open buffer tank.
// Generic visualization geometry at about real size (body 2.6 m long, lifter
// to about 4 m), millimetres, Z up, motor on -X, lifter on the front (-Y).

meta({
  name: "food-waste-depackager",
  license: 'CC0-1.0',
  title: "Food-waste depackager",
  description: "Food-waste depackager at about real size: stainless body with drum-shaped hammer-rotor housing and feed hopper, bin lifter with a wheelie bin of packaged food waste, lowered or tipping into the hopper, belt-guarded rotor motor, inclined packaging screw dropping film and bottles into a skip, slurry pump and pipe to an open buffer tank. Material controls: stainless body, frame and lifter paint, drive paint and food-waste slurry. plant, weathered, municipal and highVisibility presets.",
  tags: ["recycling", "depackager", "food waste", "anaerobic digestion", "slurry", "bin lifter", "wheelie bin", "packaging", "skip", "materials recovery", "waste management", "organics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#c3c9cb', { label: 'Body, hopper and tank (stainless)' });
const frame = param('frame', '#2f6a5a', { label: 'Frame, lifter and skip (paint)' });
const drive = param('drive', '#355f9e', { label: 'Motor, pump and screw (paint)' });
const slurry = param('slurry', '#7a5a34', { label: 'Food waste and slurry' });
const lifter = param('lifter', 'lowered', { choices: ['lowered', 'tipping'], label: 'Bin lifter' });

presets({
  plant: { body: '#c3c9cb', frame: '#2f6a5a', drive: '#355f9e', slurry: '#7a5a34' },
  weathered: { body: '#a3a9a8', frame: '#55605a', drive: '#4f5a6a', slurry: '#6a5a42' },
  municipal: { body: '#cdd2d4', frame: '#3d6fb0', drive: '#3a3f44', slurry: '#8a6a3a' },
  highVisibility: { body: '#cdd2d4', frame: '#f0c419', drive: '#c8322a', slurry: '#7a5a34' },
});

const p = assembly("food-waste-depackager");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const loftXY = (sections: [number, number, number][], x: number, y = 0) => rect(sections[0][1], sections[0][2]).loft(sections.slice(1).map(([, w, d]) => rect(w, d)), {
  planes: sections.map(([z]) => ({ plane: 'XY' as const, origin: [x, y, z] as [number, number, number] })),
  ruled: true,
});
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 10) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const dark = '#2b2f33';
const binGreen = '#58a84c';
const foodBits = ['#c98a3a', '#7f9a3a', '#d8b860', '#a5432f'];

// Body: a stainless box with the drum-shaped rotor housing along its top, on a leg frame.
const BZ = 500, BZ1 = 1500, RR = 600;
add("body", blk(0, 0, BZ, 2600, 1200, BZ1 - BZ).color(body));
add("rotor-housing", cylinder(2600, RR, 22).rotateY(90).translate(-1300, 0, BZ1).color(body));
for (const x of [-1290, 1270]) add(`housing-end-${x > 0 ? 'r' : 'l'}`, cylinder(20, RR + 30, 22).rotateY(90).translate(x, 0, BZ1).color(frame));
add("inspection-door", blk(500, -610, 700, 900, 24, 650).color(body));
for (const x of [140, 860]) add(`door-clamp-${x}`, blk(x, -630, 980, 60, 40, 120).color(dark));
add("door-window", blk(500, -625, 1100, 300, 10, 160).color('#4c6878'));
for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  add(`leg-${x > 0 ? 'r' : 'l'}-${y > 0 ? 'b' : 'f'}`, blk(x * 1180, y * 520, 0, 140, 140, BZ).color(frame));
  add(`foot-${x > 0 ? 'r' : 'l'}-${y > 0 ? 'b' : 'f'}`, blk(x * 1180, y * 520, 0, 240, 240, 20).color(frame));
}
add("base-rail-f", blk(0, -520, 120, 2360, 100, 100).color(frame));
add("base-rail-b", blk(0, 520, 120, 2360, 100, 100).color(frame));
add("water-line", cylinder(2200, 35, 10).rotateY(90).translate(-1100, -420, BZ1 + 470).color('#4f8fc0'));
add("water-valve", blk(-1150, -420, BZ1 + 410, 120, 120, 120).color('#c8322a'));

// Feed hopper on top of the rotor housing.
const HX = -300, HZ0 = BZ1 + 450, HZ1 = 2850;
add("feed-hopper", loftXY([[HZ0, 1000, 760], [HZ1 - 40, 1700, 1400], [HZ1, 1740, 1440]], HX)
  .subtract(loftXY([[HZ0 - 10, 940, 700], [HZ1 - 40, 1640, 1340], [HZ1 + 10, 1680, 1380]], HX)).color(body));
add("hopper-rim", blk(HX, 0, HZ1, 1780, 1480, 40).subtract(blk(HX, 0, HZ1 - 10, 1680, 1380, 60)).color(frame));
add("hopper-food", sphere(460).scale([1.5, 1.2, 0.3]).translate(HX, 0, HZ1 - 80).color(slurry));
add("hopper-neck", blk(HX, 0, BZ1 + 300, 1000, 760, 160).color(body));

// Bin lifter on the front: a column with a carriage, and a wheelie bin.
const LX = HX, LY = -1250;
add("lifter-column", blk(LX, LY, 0, 220, 220, 3700).color(frame));
add("lifter-foot", blk(LX, LY, 0, 900, 600, 60).color(frame));
add("lifter-brace", rod([LX, LY + 100, 2800], [LX, -560, BZ1 + 200], 50).color(frame));
add("lifter-ram", cylinder(2400, 60, 10).translate(LX + 200, LY, 200).color('#c4c9cb'));
add("lifter-ram-body", cylinder(1200, 90, 10).translate(LX + 200, LY, 200).color(dark));
// Wheelie bin built standing at the origin: tapered body, lid and wheels.
const bin: [string, Shape, string][] = [
  ["bin-body", rect(500, 600).loft([rect(580, 720)], { planes: [0, 1000].map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })), ruled: true })
    .subtract(rect(450, 550).loft([rect(530, 670)], { planes: [60, 1010].map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })), ruled: true })), binGreen],
  ["bin-rim", blk(0, 0, 980, 620, 760, 40).subtract(blk(0, 0, 970, 530, 670, 60)), binGreen],
  ["bin-wheel-l", cylinder(60, 110, 12).rotateY(90).translate(-310, 300, 110), dark],
  ["bin-wheel-r", cylinder(60, 110, 12).rotateY(90).translate(250, 300, 110), dark],
  ["bin-comb-bar", blk(0, -380, 760, 560, 40, 60), dark],
];
if (lifter.value === 'tipping') {
  const tip = (s: Shape) => s.rotateX(-135).translate(LX, LY + 120, 3560);
  for (const [name, shape, colour] of bin) add(name, tip(shape).color(colour));
  add("bin-lid", blk(0, 0, 0, 600, 760, 30).rotateX(-15).translate(LX, LY + 380, 3720).color(binGreen));
  add("lifter-carriage", blk(LX, LY + 80, 3300, 640, 180, 420).color(frame));
  for (let k = 0; k < 5; k++) add(`falling-food-${k}`, sphere(110).translate(LX - 180 + k * 90, -560 + k * 40, 3150 - k * 90).color(k === 2 ? slurry : foodBits[k % 4]));
} else {
  const stand = (s: Shape) => s.translate(LX, LY - 520, 0);
  for (const [name, shape, colour] of bin) add(name, stand(shape).color(colour));
  add("bin-lid", blk(LX, LY - 520, 1000, 620, 760, 30).color(binGreen));
  add("lifter-carriage", blk(LX, LY - 160, 700, 640, 180, 420).color(frame));
  for (let k = 0; k < 3; k++) add(`bin-food-${k}`, sphere(160).scale([1.2, 1, 0.6]).translate(LX - 150 + k * 150, LY - 520, 1060).color(k === 1 ? slurry : foodBits[k]));
}

// Rotor motor on the -X end with the belt guard over the pulleys.
add("belt-guard", blk(-1370, 0, 700, 120, 760, 1420).color('#f0c419'));
add("motor", cylinder(760, 300, 18).rotateY(90).translate(-2190, 0, 900).color(drive));
add("motor-fan-cover", cylinder(60, 310, 18).rotateY(90).translate(-2250, 0, 900).color(dark));
add("motor-base", blk(-1800, 0, 0, 900, 700, 600).color(frame));
add("motor-terminal-box", blk(-1800, -330, 1000, 220, 100, 180).color(drive));

// Packaging screw from the +X end into a skip.
const SX0 = 1300, SZ0 = 900, SX1 = 2700, SZ1 = 2100;
add("packaging-screw", rod([SX0, 0, SZ0], [SX1, 0, SZ1], 210, 14).color(drive));
add("screw-gearmotor", cylinder(420, 150, 12).rotateY(90).translate(SX1, 0, SZ1).color(drive));
add("screw-spout", blk(SX1 - 120, 0, SZ1 - 560, 320, 320, 400).color(drive));
add("screw-leg", blk(SX1 - 200, 300, 0, 100, 100, SZ1 - 200).color(frame));
const KX = 3000;
add("skip", loftXY([[150, 1300, 1300], [1300, 2200, 1340]], KX).subtract(loftXY([[210, 1220, 1220], [1320, 2120, 1260]], KX)).color(frame));
for (const y of [-500, 500]) add(`skip-runner-${y > 0 ? 'b' : 'f'}`, blk(KX, y, 0, 1500, 120, 150).color(dark));
for (const x of [-1, 1]) add(`skip-lug-${x > 0 ? 'r' : 'l'}`, cylinder(120, 60, 10).rotateX(90).translate(KX + x * 1000, -740, 1150).color(dark));
const pack = ['#e4eaee', '#3d6fb0', '#d62f2a', '#e8c33a', '#9ccf8a', '#e58aa8'];
for (let k = 0; k < 9; k++) {
  add(`packaging-${k}`, sphere(180).scale([1.4, 1, 0.5]).translate(KX - 600 + (k % 3) * 600, -400 + Math.floor(k / 3) * 400, 1180 + (k % 2) * 70).color(pack[k % pack.length]));
}
add("falling-packaging", sphere(120).scale([1, 1, 0.6]).translate(SX1 - 120, 0, 1450).color(pack[0]));

// Slurry pump on the back, piped up into an open buffer tank on -X.
add("slurry-outlet", rod([-700, 300, BZ + 10], [-700, 1050, 420], 90, 12).color(drive));
add("slurry-pump", blk(-700, 1150, 0, 600, 380, 420).color(drive));
add("pump-motor", cylinder(500, 150, 12).rotateY(90).translate(-300, 1150, 210).color(drive));
add("slurry-pipe", rod([-1000, 1150, 300], [-1500, 1300, 300], 90, 12).color(drive));
add("slurry-riser", cylinder(2700, 90, 12).translate(-1500, 1300, 300).color(drive));
add("slurry-bend", sphere(90).translate(-1500, 1300, 3000).color(drive));
add("slurry-inlet", rod([-1500, 1300, 3000], [-1700, 1900, 3000], 90, 12).color(drive));
const TX = -1900, TY = 2300, TR = 700, TH = 2900;
add("buffer-tank", cylinder(TH, TR, 22).translate(TX, TY, 0).subtract(cylinder(TH, TR - 20, 22).translate(TX, TY, 300)).color(body));
add("tank-slurry", cylinder(20, TR - 22, 22).translate(TX, TY, TH - 300).color(slurry));
add("tank-rim", cylinder(50, TR + 30, 22).translate(TX, TY, TH - 50).color(frame));
add("tank-mixer-bridge", blk(TX, TY, TH, 1500, 160, 120).color(frame));
add("tank-mixer-motor", cylinder(420, 160, 14).translate(TX, TY, TH + 120).color(drive));
add("tank-ladder-l", blk(TX + 220, TY - TR - 40, 0, 40, 40, TH + 600).color(frame));
add("tank-ladder-r", blk(TX - 220, TY - TR - 40, 0, 40, 40, TH + 600).color(frame));
for (let k = 1; k < 10; k++) add(`tank-rung-${k}`, blk(TX, TY - TR - 40, k * 300, 440, 30, 30).color(frame));

// Control panel on the lifter side.
add("control-post", blk(1500, -1050, 0, 80, 80, 1300).color(frame));
add("control-box", blk(1500, -1140, 1000, 420, 160, 500).color('#d9d9d4'));
add("estop", cylinder(30, 50, 10).rotateX(90).translate(1620, -1220, 1380).color('#d62f2a'));
add("lift-button", cylinder(25, 32, 10).rotateX(90).translate(1400, -1220, 1380).color('#2f9a4f'));
add("hour-meter", blk(1500, -1225, 1150, 160, 10, 100).color(dark));

return p.model();
