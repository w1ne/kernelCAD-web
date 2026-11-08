// SPDX-License-Identifier: CC0-1.0
// Glass dryer: the gas-fired rotary drum dryer that takes washed, wet cullet
// and tumbles it through hot air until it is dry enough to sort optically.
// What makes it that machine rather than a tank: a long drum lying almost
// level with a slight fall toward the discharge end, two steel riding rings
// turning on pairs of trunnion rollers on concrete piers, a girth gear
// driven by a pinion, gearbox and motor on a floor skid, a firing hood at
// the feed end with the burner, combustion-air fan and gas train, a feed
// hopper of wet cullet on top of it, and a discharge hood at the far end
// with a tall exhaust stack and an outlet chute dropping dry cullet onto a
// pile (or onto a take-away belt).
// Generic visualization geometry at about real size (drum 4.2 m x 1.2 m,
// stack to 4.4 m), millimetres, Z up, feed end on -X, drive on the front (-Y).

meta({
  name: "glass-dryer",
  license: 'CC0-1.0',
  title: "Glass dryer",
  description: "Rotary drum dryer for washed glass cullet at about real size: slightly inclined drum on two riding rings and trunnion rollers on concrete piers, girth gear with pinion, gearbox and motor, firing hood with burner, combustion-air fan and gas train, wet-cullet feed hopper, discharge hood with exhaust stack and an outlet chute onto a cullet pile or a take-away belt. Material controls: drum paint, hood paint, machined steel and glass cullet. plant, weathered, ambercullet and highVisibility presets.",
  tags: ["recycling", "glass dryer", "rotary dryer", "drum dryer", "cullet", "glass recycling", "burner", "materials recovery", "waste management", "glass", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const drum = param('drum', '#7a3b2e', { label: 'Drum shell (heat-resistant paint)' });
const hood = param('hood', '#647b66', { label: 'Hoods, stack and fan (paint)' });
const steel = param('steel', '#b4babc', { label: 'Riding rings, rollers and gear (steel)' });
const cullet = param('cullet', '#6fae7f', { label: 'Glass cullet' });
const discharge = param('discharge', 'pile', { choices: ['pile', 'belt'], label: 'Dry cullet out to' });

presets({
  plant: { drum: '#7a3b2e', hood: '#647b66', steel: '#b4babc', cullet: '#6fae7f' },
  weathered: { drum: '#5e4a40', hood: '#687662', steel: '#9ea7a5', cullet: '#8aa38c' },
  amberCullet: { drum: '#3a3f44', hood: '#8a8f92', steel: '#c4c9cb', cullet: '#b8732e' },
  highVisibility: { drum: '#c8322a', hood: '#f0c419', steel: '#c4c9cb', cullet: '#bfe3d6' },
});

const p = assembly("glass-dryer");
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
const concrete = '#a9a59c';

// Drum axis: falls 3° from the feed end (-X) toward the discharge end (+X).
const L = 4200, R = 600, X0 = -2100, Z0 = 1500, FALL = 3;
const T = (s: Shape) => s.rotateY(FALL).translate(X0, 0, Z0);
const axisZ = (x: number) => Z0 - (x - X0) * Math.tan((FALL * Math.PI) / 180);
const alongX = (len: number, r: number, x: number, seg = 22) => T(cylinder(len, r, seg).rotateY(90).translate(x, 0, 0));

add("drum", alongX(L, R, 0).color(drum));
for (const x of [300, L - 300]) add(`drum-band-${x}`, alongX(60, R + 12, x - 30).color(dark));
for (const x of [800, L - 800]) add(`riding-ring-${x}`, alongX(200, R + 80, x - 100).color(steel));
add("girth-gear", alongX(130, R + 120, 1850).color(dark));
add("girth-gear-flange", alongX(30, R + 40, 1810).color(steel));

// Trunnion rollers on concrete piers under each riding ring.
for (const x of [800, L - 800]) {
  const wx = X0 + x, az = axisZ(wx), rr = 210, dc = R + 80 + rr;
  const tag = x < L / 2 ? 'feed' : 'out';
  for (const s of [-1, 1]) {
    const y = s * dc * Math.sin(Math.PI / 6), z = az - dc * Math.cos(Math.PI / 6);
    add(`roller-${tag}-${s > 0 ? 'b' : 'f'}`, cylinder(240, rr, 16).rotateY(90).translate(wx - 120, y, z).color(steel));
    add(`roller-block-${tag}-${s > 0 ? 'b' : 'f'}`, blk(wx, y, z - rr - 60, 520, 260, 200).color(hood));
  }
  add(`pier-${tag}`, blk(wx, 0, 0, 800, 1500, az - dc * Math.cos(Math.PI / 6) - rr - 60).color(concrete));
}

// Drive: pinion under the girth gear on the front, gearbox and motor on a skid.
const GX = X0 + 1915, gz = axisZ(GX), pd = R + 120 + 150;
const py = -pd * Math.sin((40 * Math.PI) / 180), pz = gz - pd * Math.cos((40 * Math.PI) / 180);
add("pinion", cylinder(160, 150, 14).rotateY(90).translate(GX - 80, py, pz).color(dark));
add("pinion-shaft", cylinder(700, 50, 10).rotateY(90).translate(GX - 700, py, pz).color(steel));
add("gear-guard", blk(GX, py + 40, pz - 200, 260, 380, 420).subtract(blk(GX, py - 200, pz - 180, 300, 300, 200)).color('#f0c419'));
add("drive-skid", blk(GX - 1000, py - 120, 0, 1500, 700, 160).color(hood));
add("gearbox", blk(GX - 820, py, 160, 420, 520, pz - 160 + 220).color(hood));
add("motor", cylinder(620, 210, 16).rotateY(90).translate(GX - 1650, py, pz - 40).color(hood));
add("motor-fan-cover", cylinder(60, 220, 16).rotateY(90).translate(GX - 1710, py, pz - 40).color(dark));
add("motor-feet", blk(GX - 1340, py, 160, 520, 380, pz - 40 - 210 - 160).color(hood));

// Firing hood at the feed end: burner, combustion-air fan, gas train and the wet-cullet hopper on top.
const FX = X0 - 260, FZ = axisZ(X0);
add("firing-hood", blk(FX, 0, 300, 560, 1700, 2000).color(hood));
add("firing-hood-seal", T(cylinder(80, R + 60, 22).rotateY(90).translate(-60, 0, 0)).color(dark));
add("burner-tube", cylinder(600, 260, 16).rotateY(90).translate(FX - 880, 0, FZ).color(dark));
add("burner-head", cylinder(220, 340, 16).rotateY(90).translate(FX - 1000, 0, FZ).color('#c8322a'));
add("fan-scroll", cylinder(340, 460, 18).rotateX(90).translate(FX - 900, 980, FZ + 100).color(hood));
add("fan-duct", blk(FX - 900, 470, FZ - 150, 360, 420, 380).color(hood));
add("fan-motor", cylinder(420, 180, 14).rotateX(90).translate(FX - 900, 1400, FZ + 100).color(dark));
add("gas-train", cylinder(1400, 45, 10).rotateY(90).translate(FX - 1500, -600, 700).color('#e8c33a'));
add("gas-riser", rod([FX - 1500, -600, 700], [FX - 1110, -260, FZ - 60], 45).color('#e8c33a'));
for (const [k, x] of [FX - 1350, FX - 1000, FX - 650].entries()) add(`gas-valve-${k}`, blk(x, -600, 640, 140, 140, 140).color(k === 1 ? '#c8322a' : dark));
add("gas-train-stand", blk(FX - 1000, -600, 0, 80, 80, 640).color(hood));
const HZ0 = 2300, HZ1 = 3000;
add("feed-hopper", loftXY([[HZ0, 520, 520], [HZ1 - 40, 1300, 1200], [HZ1, 1340, 1240]], FX)
  .subtract(loftXY([[HZ0 - 10, 460, 460], [HZ1 - 40, 1240, 1140], [HZ1 + 10, 1280, 1180]], FX)).color(hood));
add("hopper-cullet", sphere(440).scale([1.35, 1.25, 0.32]).translate(FX, 0, HZ1 - 70).color(cullet));
add("hopper-ladder-l", blk(FX + 200, -900, 0, 40, 40, 2900).color(hood));
add("hopper-ladder-r", blk(FX - 200, -900, 0, 40, 40, 2900).color(hood));
for (let k = 1; k < 10; k++) add(`hopper-rung-${k}`, blk(FX, -900, k * 290, 400, 30, 30).color(hood));

// Discharge hood at the far end with the exhaust stack and outlet chute.
const DX = X0 + L + 280;
add("discharge-hood", blk(DX, 0, 1100, 640, 1700, 1600).color(hood));
add("discharge-seal", T(cylinder(80, R + 60, 22).rotateY(90).translate(L - 20, 0, 0)).color(dark));
add("stack", cylinder(1700, 300, 16).translate(DX, 0, 2700).color(hood));
add("stack-cap", cylinder(80, 380, 16).translate(DX, 0, 4400).color(dark));
add("stack-damper", cylinder(120, 320, 16).translate(DX, 0, 3100).color(dark));
add("hood-door", blk(DX - 120, -860, 1500, 380, 30, 500).color(steel));
add("hood-legs-f", blk(DX, -760, 0, 120, 120, 1100).color(hood));
add("hood-legs-b", blk(DX, 760, 0, 120, 120, 1100).color(hood));
add("outlet-chute", loftXY([[620, 380, 380], [1100, 560, 560]], DX).subtract(loftXY([[600, 330, 330], [1120, 510, 510]], DX)).color(hood));

const onBelt = discharge.value === 'belt';
if (onBelt) {
  // Take-away belt running out to +X under the chute.
  add("belt-frame", blk(DX + 700, 0, 300, 2400, 700, 160).color(hood));
  add("belt", blk(DX + 700, 0, 460, 2400, 600, 30).color(dark));
  for (const x of [DX - 400, DX + 1800]) add(`belt-pulley-${x > DX ? 'tail' : 'head'}`, cylinder(640, 110, 12).rotateX(90).translate(x, 320, 380).color(steel));
  for (const x of [DX - 300, DX + 700, DX + 1700]) for (const y of [-300, 300]) add(`belt-leg-${x - DX + 300}-${y > 0 ? 'b' : 'f'}`, blk(x, y, 0, 80, 80, 300).color(hood));
  for (let k = 0; k < 5; k++) add(`belt-cullet-${k}`, sphere(200).scale([1.4, 1, 0.45]).translate(DX + k * 380, 0, 500).color(cullet));
} else {
  add("cullet-pile", sphere(900).scale([1.25, 1, 0.65]).translate(DX + 200, 0, 0).subtract(blk(DX + 200, 0, -700, 2500, 2000, 700)).color(cullet));
  add("cullet-pile-shoulder", sphere(500).scale([1.2, 1, 0.6]).translate(DX + 900, -500, 0).subtract(blk(DX + 900, -500, -400, 1400, 1200, 400)).color(cullet));
}

// Control cabinet beside the burner end.
add("control-cabinet", blk(FX - 2000, -1100, 0, 700, 400, 1900).color('#d9d9d4'));
add("cabinet-plinth", blk(FX - 2000, -1100, 0, 720, 420, 100).color(dark));
add("cabinet-screen", blk(FX - 2000, -1305, 1300, 320, 10, 220).color('#24425e'));
add("cabinet-estop", cylinder(30, 50, 10).rotateX(90).translate(FX - 1800, -1300, 1050).color('#d62f2a'));
add("flame-lamp", cylinder(30, 30, 10).rotateX(90).translate(FX - 2200, -1300, 1050).color('#f08c2a'));

return p.model();
