// SPDX-License-Identifier: CC0-1.0
// Hydraulic power pack: the oil-pressure unit that drives a baler ram,
// compactor or shear. What makes it a power pack rather than a cabinet: an
// oil reservoir on a drip-tray skid with a level sight glass, temperature
// gauge, drain valve and breather on top; a horizontal finned electric motor
// with fan cowl and terminal box coupled through a bell housing to the pump;
// a stacked solenoid valve manifold with coil connectors, a return filter,
// a pressure gauge panel facing the operator, a gas-charged accumulator,
// pressure and return hoses to bulkhead couplings, and an optional
// air-blast oil cooler.
// Generic visualization geometry at about real size (1.9 m skid, 1.5 m tall),
// millimetres, Z up, gauges and sight glass on -Y.

meta({
  name: "hydraulic-power-pack",
  license: 'CC0-1.0',
  title: "Hydraulic power pack",
  description: "Hydraulic power pack at about real size: oil reservoir on a drip-tray skid with sight glass, temperature gauge, drain valve and breather, finned electric motor with fan cowl and terminal box, bell housing and pump, stacked solenoid valve manifold, return filter, pressure gauge panel, accumulator, hoses to bulkhead couplings and starter box. Optional air-blast oil cooler. Material controls: reservoir, motor, valves and hoses. industrial, safetyYellow and marine presets.",
  tags: ["hydraulic", "hydraulic power pack", "hpu", "power unit", "pump", "electric motor", "solenoid valve", "baler", "compactor", "recycling", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const reservoir = param('reservoir', '#c3c6c2', { label: 'Reservoir and skid (paint)' });
const motor = param('motor', '#2c5ea8', { label: 'Electric motor (paint)' });
const valves = param('valves', '#d4b03c', { label: 'Valve manifold (zinc-yellow)' });
const hoses = param('hoses', '#1c1d1e', { label: 'Hoses (rubber)' });
const cooler = param('cooler', 'air-blast', { choices: ['none', 'air-blast'], label: 'Oil cooler' });

presets({
  industrial: { reservoir: '#c3c6c2', motor: '#2c5ea8', valves: '#d4b03c', hoses: '#1c1d1e' },
  safetyYellow: { reservoir: '#e0a526', motor: '#3a3d40', valves: '#b9bec0', hoses: '#1c1d1e' },
  marine: { reservoir: '#2f6a8a', motor: '#d8dcd8', valves: '#c9a63a', hoses: '#24272a' },
});

const p = assembly("hydraulic-power-pack");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const alongX = (x0: number, len: number, y: number, z: number, r: number, n = 14) => cylinder(len, r, n).rotateY(90).translate(x0, y, z);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const SK = 120; // skid height
const TH = 700; // tank height
const TT = SK + TH; // tank top
const FY = -400; // tank front face

// Drip-tray skid and reservoir.
add("drip-tray", blk(0, 0, 0, 1900, 950, SK).subtract(blk(0, 0, 40, 1840, 890, SK)).color('#3a3d40'));
add("tank", blk(-50, 0, SK, 1400, 800, TH).color(reservoir));
add("tank-lid", blk(-50, 0, TT, 1440, 840, 20).color(reservoir));
for (const [s, x] of [['l', -700], ['r', 600]] as const) add(`lift-eye-${s}`, torus(40, 12, 10).rotateX(90).translate(x, FY - 10, TT + 40).color('#5d6366'));
// Front face: level sight glass, temperature gauge, drain valve, nameplate.
add("sight-glass-frame", blk(-500, FY - 8, SK + 180, 90, 16, 420).color('#5d6366'));
add("sight-glass", blk(-500, FY - 18, SK + 200, 50, 6, 380).color('#d9e6e8'));
add("oil-level", blk(-500, FY - 20, SK + 200, 50, 6, 250).color('#b88a2a'));
add("temp-gauge", cylinder(30, 60, 14).rotateX(90).translate(-300, FY, SK + 520).color('#5d6366'));
add("temp-gauge-face", cylinder(6, 50, 14).rotateX(90).translate(-300, FY - 30, SK + 520).color('#f2f2ee'));
add("drain-valve", alongX(-700, 120, FY - 60, SK + 60, 30, 8).color('#5d6366'));
add("drain-lever", blk(-640, FY - 60, SK + 90, 30, 160, 16).color('#c8322a'));
add("nameplate", blk(150, FY - 3, SK + 450, 260, 6, 160).color('#e9e6dc'));
add("nameplate-band", blk(150, FY - 7, SK + 570, 260, 4, 30).color(motor));

// Breather / filler cap and inspection cover on the tank top.
add("inspection-cover", blk(-450, 220, TT + 20, 400, 260, 16).color(reservoir));
for (let k = 0; k < 6; k++) add(`cover-bolt-${k}`, cylinder(14, 12, 6).translate(-620 + (k % 3) * 170, k < 3 ? 110 : 330, TT + 36).color('#5d6366'));
add("breather", cylinder(90, 60, 12).translate(-150, 280, TT + 20).color('#3a3d40'));
add("breather-cap", cylinder(50, 70, 12).translate(-150, 280, TT + 110).color('#c8322a'));

// Motor -> bell housing -> pump, axis along X on a motor pad.
const MZ = TT + 260;
const MY = -120;
add("motor-pad", blk(-280, MY, TT + 20, 820, 380, 40).color('#3a3d40'));
add("motor-body", alongX(-620, 640, MY, MZ, 200, 16).color(motor));
for (let k = 0; k < 7; k++) add(`motor-fin-${k}`, alongX(-570 + k * 80, 26, MY, MZ, 218, 16).color(motor));
add("fan-cowl", alongX(-760, 140, MY, MZ, 205, 16).color(motor));
add("fan-grille", alongX(-772, 14, MY, MZ, 170, 16).color('#2b2e30'));
for (const [s, y] of [['f', MY - 150], ['b', MY + 150]] as const) add(`motor-foot-${s}`, blk(-300, y, TT + 60, 520, 70, MZ - TT - 60 - 120).color(motor));
add("terminal-box", blk(-280, MY, MZ + 180, 220, 200, 150).color(motor));
add("cable-gland", cylinder(60, 25, 8).rotateX(90).translate(-280, MY - 100, MZ + 255).color('#3a3d40'));
add("bell-housing", alongX(20, 200, MY, MZ, 150, 14).color(reservoir));
add("pump", blk(310, MY, MZ - 110, 180, 180, 220).color('#5d6366'));
add("suction-line", rod([310, MY, MZ - 110], [310, MY, TT + 20], 45).color('#5d6366'));

// Stacked solenoid valve manifold, coils facing out along X, on the -Y half.
const VX = 560;
const VY = -220;
add("manifold", blk(VX, VY, TT + 20, 320, 220, 140).color(valves));
for (let k = 0; k < 3; k++) {
  const z = TT + 160 + k * 110;
  add(`valve-body-${k}`, blk(VX, VY, z, 160, 200, 100).color(valves));
  for (const [s, dx] of [['l', -1], ['r', 1]] as const) {
    add(`coil-${k}-${s}`, alongX(dx < 0 ? VX - 80 - 110 : VX + 80, 110, VY, z + 50, 42, 10).color('#2b2e30'));
    add(`plug-${k}-${s}`, blk(VX + dx * 140, VY - 50, z + 50, 50, 40, 60).color(k === 0 ? '#c8322a' : '#2b2e30'));
  }
}
add("relief-valve", alongX(VX - 300, 140, VY + 160, TT + 90, 30, 8).color(valves));
add("relief-knob", alongX(VX - 330, 30, VY + 160, TT + 90, 45, 10).color('#2b2e30'));

// Gauge panel facing the operator, return filter behind the manifold.
add("gauge-post", blk(VX, FY + 20, TT + 20, 40, 40, 420).color('#3a3d40'));
add("gauge-panel", blk(VX, FY + 10, TT + 300, 380, 20, 200).color('#3a3d40'));
for (const [n, x] of [['system', VX - 90], ['pilot', VX + 90]] as const) {
  add(`gauge-${n}`, cylinder(40, 75, 16).rotateX(90).translate(x, FY, TT + 400).color('#5d6366'));
  add(`gauge-${n}-face`, cylinder(6, 64, 16).rotateX(90).translate(x, FY - 40, TT + 400).color('#f2f2ee'));
  add(`gauge-${n}-needle`, box(8, 4, 55, true).rotateY(-40).translate(x + 18, FY - 48, TT + 420).color('#c8322a'));
}
add("return-filter", cylinder(260, 90, 14).translate(VX + 50, 260, TT + 20).color(valves));
add("return-filter-cap", cylinder(40, 100, 14).translate(VX + 50, 260, TT + 280).color('#2b2e30'));
add("filter-indicator", cylinder(30, 25, 8).translate(VX + 50, 260, TT + 320).color('#3cdc5a'));

// Accumulator standing on the skid's +X end.
add("accumulator-clamp", blk(850, -200, SK, 160, 160, 60).color('#3a3d40'));
add("accumulator", cylinder(640, 85, 14).translate(850, -200, SK + 60).color('#c8322a'));
add("accumulator-dome", sphere(85).scale([1, 1, 0.7]).translate(850, -200, SK + 700).color('#c8322a'));
add("charging-valve", cylinder(70, 22, 8).translate(850, -200, SK + 755).color('#d4d7d4'));
add("accumulator-line", rod([850, -200, SK + 120], [VX + 160, VY, TT + 70], 18).color(hoses));

// Pressure and return hoses sweeping down to bulkhead couplings at the -X end.
const hose = (name: string, pts: [number, number, number][], r: number) => {
  for (let k = 0; k < pts.length - 1; k++) add(`${name}-${k}`, rod(pts[k], pts[k + 1], r).color(hoses));
  for (let k = 1; k < pts.length - 1; k++) add(`${name}-joint-${k}`, sphere(r).translate(pts[k][0], pts[k][1], pts[k][2]).color(hoses));
};
const VT = TT + 160 + 2 * 110 + 100;
hose("pressure-hose", [[VX - 30, VY, VT], [VX - 60, VY - 120, VT + 160], [VX - 200, FY - 160, VT + 60], [VX - 360, FY - 220, TT - 120], [VX - 420, FY - 180, SK + 220]], 22);
hose("return-hose", [[VX + 30, VY, VT], [VX + 60, VY - 140, VT + 120], [VX + 120, FY - 180, VT - 20], [VX + 160, FY - 220, TT - 200], [VX + 140, FY - 160, SK + 220]], 26);
add("bulkhead", blk(VX - 140, FY - 160, SK, 700, 120, 160).color('#3a3d40'));
for (const [s, x] of [['p', VX - 420], ['t', VX + 140]] as const) add(`coupling-${s}`, cylinder(70, 34, 8).translate(x, FY - 160, SK + 160).color('#d4d7d4'));

// Starter box on a post at the -X end of the skid.
add("starter-post", blk(-870, -200, SK, 60, 60, 900).color('#3a3d40'));
add("starter-box", blk(-870, -260, SK + 800, 220, 140, 300).color(reservoir));
add("starter-start", cylinder(14, 28, 10).rotateX(90).translate(-910, -330, SK + 1000).color('#3cdc5a'));
add("starter-stop", cylinder(20, 36, 10).rotateX(90).translate(-830, -330, SK + 1000).color('#c8322a'));
add("starter-isolator", blk(-870, -335, SK + 870, 90, 10, 70).color('#f0c419'));

// Optional air-blast oil cooler on the tank's back edge.
if (cooler.value === 'air-blast') {
  add("cooler-core", blk(150, 300, TT + 20, 560, 120, 460).color('#5d6366'));
  for (let k = 0; k < 10; k++) add(`cooler-fin-${k}`, blk(-110 + k * 58, 238, TT + 50, 14, 6, 400).color('#8a9094'));
  add("cooler-fan-ring", cylinder(40, 210, 16).rotateX(90).translate(150, 240, TT + 250).color('#2b2e30'));
  add("cooler-fan-hub", cylinder(46, 50, 10).rotateX(90).translate(150, 236, TT + 250).color(motor));
}

return p.model();
