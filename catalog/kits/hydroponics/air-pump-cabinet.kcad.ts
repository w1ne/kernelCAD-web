// SPDX-License-Identifier: CC0-1.0
// Air pump cabinet: the ventilated steel cabinet that houses the linear
// diaphragm air pumps feeding a greenhouse's deep-water-culture beds, shown
// with its louvred door swung open.
// What makes it an air pump cabinet: rounded linear pumps on rubber feet
// with front intake grilles, their outlet hoses rising to a gang-valve air
// manifold on the roof with a pressure gauge, a shelf carrying the timer
// controller and an airflow meter, and a roof exhaust hood.
// Generic visualization geometry at about real size (cabinet about 700 x 520
// x 980 mm), millimetres, Z up, front toward -Y.

meta({
  name: "air-pump-cabinet",
  license: 'CC0-1.0',
  title: "Air pump cabinet",
  description: "Hydroponic air pump cabinet at about real size: steel cabinet on a plinth with its louvred door swung open, one or two rounded linear diaphragm air pumps with intake grilles and outlet hoses, a shelf with a timer controller and airflow meter, a roof exhaust hood and a gang-valve air manifold with pressure gauge and airlines. Material controls: cabinet, pump housings, airlines, gang valves, plus a one/two pump choice. greenhouseGreen, labWhite, safetyOrange and weathered presets.",
  tags: ['air pump', 'linear air pump', 'diaphragm pump', 'aeration', 'cabinet', 'gang valve', 'deep water culture', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinet = param('cabinet', '#3f7a64', { label: 'Cabinet (powder-coated steel)' });
const housing = param('housing', '#d9d4c4', { label: 'Pump housings (polymer)' });
const airline = param('airline', '#cfe0d8', { label: 'Airlines (clear vinyl)' });
const valves = param('valves', '#2f6fa8', { label: 'Gang valves (polymer)' });
const pumps = param('pumps', 'two pumps', { choices: ['one pump', 'two pumps'], label: 'Pumps' });

presets({
  greenhouseGreen: { cabinet: '#3f7a64', housing: '#d9d4c4', airline: '#cfe0d8', valves: '#2f6fa8' },
  labWhite: { cabinet: '#e6e8e4', housing: '#3c4246', airline: '#d7e2dc', valves: '#2a8a4a' },
  safetyOrange: { cabinet: '#d8742e', housing: '#e9e6dc', airline: '#cfd8d2', valves: '#26292c' },
  weathered: { cabinet: '#5d7368', housing: '#bdb59e', airline: '#c9c4a6', valves: '#4f6a80' },
});

const p = assembly("air-pump-cabinet");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const run = (name: string, pts: [number, number, number][], r: number, color: string) => {
  for (let k = 0; k < pts.length - 1; k++) add(`${name}-${k}`, rod(pts[k], pts[k + 1], r, 6).color(color));
};

const W = 700; // cabinet width (X)
const D = 520; // cabinet depth (Y)
const H = 900; // cabinet height above the plinth
const Z0 = 80; // plinth height
const FY = -D / 2;
const ZR = Z0 + H; // roof

// Plinth and open-fronted shell (20 mm sides, 30 mm back, top and floor).
add("plinth", blk(0, 0, 0, W - 40, D - 40, Z0).color('#2a2d30'));
add("shell", blk(0, 0, Z0, W, D, H).subtract(blk(0, -30, Z0 + 30, W - 40, D, H - 60)).color(cabinet));
add("interior-back", blk(0, D / 2 - 32, Z0 + 30, W - 40, 4, H - 60).color('#c9ccc6'));
add("shelf", blk(0, -10, Z0 + 520, W - 40, D - 60, 18).color(cabinet));

// Door hinged on the -X front edge, swung back beside the cabinet. Built with
// the hinge at the origin, spanning +X; louvre slots go right through it.
const door = (s: Shape) => s.rotateZ(-155).translate(-W / 2, FY, 0);
let leaf = blk(W / 2 - 5, -10, Z0 + 10, W - 10, 20, H - 20);
for (let k = 0; k < 7; k++) leaf = leaf.subtract(blk(W / 2, -10, Z0 + 520 + k * 50, 420, 40, 22));
for (let k = 0; k < 4; k++) leaf = leaf.subtract(blk(W / 2, -10, Z0 + 90 + k * 50, 420, 40, 22));
add("door", door(leaf).color(cabinet));
add("door-wiring-card", door(blk(W / 2 + 40, 4, Z0 + 330, 260, 6, 150)).color('#f2f0e6'));
add("door-handle", door(blk(W - 50, -30, Z0 + 420, 24, 30, 140)).color('#2a2d30'));
for (const [i, z] of [Z0 + 120, Z0 + H - 160].entries()) add(`hinge-${i}`, cylZ(-W / 2, FY - 8, z, 60, 10, 8).color('#5a6066'));

// Linear diaphragm pumps: rounded body on rubber feet, front intake grille,
// brand stripe, outlet nozzle on top with a hose up to the roof manifold.
const pump = (tag: string, x: number, z: number) => {
  const y = -40;
  add(`${tag}-feet`, blk(x, y, z, 280, 210, 16).color('#1b1b1b'));
  add(`${tag}-body`, blk(x, y, z + 16, 290, 220, 110).color(housing));
  add(`${tag}-crown`, cylX(x - 145, y, z + 126, 290, 110, 16).color(housing));
  add(`${tag}-grille`, blk(x - 30, y - 113, z + 40, 170, 6, 120).color('#3a3f44'));
  for (let k = 0; k < 5; k++) add(`${tag}-grille-slat-${k}`, blk(x - 30, y - 117, z + 52 + k * 22, 160, 4, 8).color(housing));
  add(`${tag}-stripe`, blk(x + 95, y - 113, z + 40, 50, 6, 150).color(valves));
  add(`${tag}-switch`, blk(x + 95, y - 118, z + 200, 30, 6, 20).color('#c0392b'));
  add(`${tag}-nozzle`, cylZ(x + 80, y, z + 225, 50, 14, 10).color('#c9ccce'));
  run(`${tag}-hose`, [[x + 80, y, z + 275], [x + 80, y + 40, z + 340], [x + 60, 120, ZR - 160], [0, 120, ZR - 40]], 11, airline);
  run(`${tag}-cord`, [[x - 145, y + 60, z + 70], [x - 200, y + 120, z + 40], [x - 220, 200, Z0 + 32]], 5, '#1b1b1b');
};
if (pumps.value === 'two pumps') {
  pump('pump-a', -165, Z0 + 30);
  pump('pump-b', 165, Z0 + 30);
} else {
  pump('pump-a', 0, Z0 + 30);
}

// Shelf: timer controller with display and a rotameter airflow meter.
const ZS = Z0 + 538;
add("controller", blk(-150, -40, ZS, 220, 140, 170).color('#e9ebe7'));
add("controller-display", blk(-170, -112, ZS + 100, 120, 6, 45).color('#14281d'));
for (let k = 0; k < 3; k++) add(`controller-digit-${k}`, blk(-205 + k * 34, -116, ZS + 108, 22, 3, 30).color('#6fe08a'));
for (const [i, x] of [-200, -150, -100].entries()) add(`controller-key-${i}`, cylY(x, -110, ZS + 50, 8, 12, 8).color(i === 0 ? '#2a8a4a' : '#5a6066'));
add("power-strip", blk(-150, 60, ZS, 260, 60, 50).color('#2a2d30'));
add("flowmeter-back", blk(160, -40, ZS, 90, 30, 300).color('#e9ebe7'));
add("flowmeter-tube", cylZ(160, -70, ZS + 30, 240, 16, 10).color('#cfe0d8'));
add("flowmeter-float", cylZ(160, -70, ZS + 170, 18, 18, 10).color('#c0392b'));
for (let k = 0; k < 5; k++) add(`flowmeter-tick-${k}`, blk(190, -58, ZS + 50 + k * 45, 20, 3, 4).color('#2a2d30'));

// Roof: exhaust hood and the gang-valve manifold with pressure gauge.
add("exhaust-hood", blk(0, 90, ZR, W - 220, 260, 70).color(cabinet));
add("exhaust-slot", blk(0, 90 - 131, ZR + 12, W - 260, 4, 40).color('#1b1d1f'));
const MY = FY + 70;
const MZ = ZR + 70;
const n = 8;
add("manifold-pipe", cylX(-300, MY, MZ, 600, 22, 14).color('#d8dcd8'));
for (const sx of [-1, 1]) {
  add(`manifold-cap-${sx > 0 ? 'r' : 'l'}`, cylX(sx > 0 ? 300 : -320, MY, MZ, 20, 27, 14).color('#d8dcd8'));
  add(`manifold-bracket-${sx > 0 ? 'r' : 'l'}`, blk(sx * 260, MY, ZR, 30, 50, MZ - ZR).color('#5a6066'));
}
add("manifold-feed", cylZ(0, MY, ZR, MZ - ZR, 14, 10).color('#d8dcd8'));
for (let k = 0; k < n; k++) {
  const x = -262 + (k * 524) / (n - 1);
  add(`valve-${k}`, blk(x, MY, MZ + 18, 30, 34, 42).color(valves));
  add(`valve-lever-${k}`, box(10, 44, 8, true).rotateZ(k % 3 === 2 ? 90 : 0).translate(x, MY - 6, MZ + 64).color('#f2f2ec'));
  add(`valve-barb-${k}`, cylY(x, MY - 17, MZ + 34, 30, 5, 6).color('#c9ccce'));
  // Airlines leave the front, loop up and run back over the roof to the beds.
  run(`airline-${k}`, [[x, MY - 47, MZ + 34], [x, MY - 80, MZ + 100], [x * 1.05, MY + 150, MZ + 170], [x * 1.1, D / 2 + 140, MZ + 60], [x * 1.15, D / 2 + 220, 14]], 5, airline);
}
add("gauge-stem", cylZ(-330, MY, MZ, 90, 7, 8).color('#c9ccce'));
add("gauge-case", cylY(-330, MY + 15, MZ + 140, 30, 55, 18).color('#2a2d30'));
add("gauge-face", cylY(-330, MY - 15, MZ + 140, 4, 48, 18).color('#f2f2ec'));
add("gauge-needle", box(6, 3, 40, true).rotateY(-35).translate(-318, MY - 21, MZ + 150).color('#c0392b'));

// Mains cable from the back.
run("mains", [[200, D / 2, Z0 + 60], [260, D / 2 + 120, 20], [300, D / 2 + 300, 8]], 6, '#1b1b1b');

return p.model();
