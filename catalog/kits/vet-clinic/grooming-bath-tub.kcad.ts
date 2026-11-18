// SPDX-License-Identifier: CC0-1.0
// Walk-in grooming bath tub, the raised stainless tub a groomer or vet nurse
// washes a dog in. What makes one: a deep open-top stainless tub at waist
// height with tall back and side splash walls, a walk-in door cut in the front
// wall swung open, a rubber floor mat and drain inside, a gooseneck mixer tap
// on the back splash with a handheld sprayer on a looped hose, an L-shaped
// grooming arm with a restraint loop, and a stainless leg frame with a
// storage shelf. A cleated ramp lets a large dog walk up to the door.
// The access choice shows the ramp in place or stowed.
// Millimetres, Z up, front (door) on -Y.
meta({
  name: "grooming-bath-tub",
  license: 'CC0-1.0',
  title: "Veterinary grooming bath tub",
  description: "Walk-in stainless grooming tub at real size: deep open tub with tall back and side splash walls, front walk-in door swung open, rubber floor mat and drain, gooseneck mixer tap with handheld sprayer on a looped hose, grooming arm with restraint loop, stainless leg frame with storage shelf and a cleated walk-up ramp. Access choice (ramp, stowed) adds or removes the ramp. Material controls: tub steel, floor mat, hose and restraint loop. clinicClean, softTeal and salon presets.",
  tags: ["veterinary", "animal clinic", "grooming", "dog bath", "wash tub", "walk-in tub", "stainless", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const access = param('access', 'ramp', { choices: ['ramp', 'stowed'], label: 'Walk-up ramp' });
const tubSteel = param('tubSteel', '#c5cdcf', { label: 'Tub stainless steel' });
const mat = param('mat', '#3f6f8e', { label: 'Floor mat rubber' });
const hose = param('hose', '#2c3033', { label: 'Sprayer hose' });
const loop = param('loop', '#c0392b', { label: 'Restraint loop' });

presets({
  clinicClean: { mat: '#5b6a72', loop: '#3d6fb5' },
  softTeal: { tubSteel: '#b4c6c7', mat: '#2f8b8a', loop: '#e0b21e' },
  salon: { mat: '#c45d8e', hose: '#e9e4ea', loop: '#7a4fa3' },
});

const p = assembly("grooming-bath-tub");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const tube = (a: number[], b: number[], r: number, seg = 10) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return cylinder(len, r, seg)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
const poly = (name: string, pts: number[][], r: number, colour: string) => {
  for (let k = 0; k < pts.length - 1; k++) add(`${name}-${k}`, tube(pts[k], pts[k + 1], r).color(colour));
  for (let k = 1; k < pts.length - 1; k++) add(`${name}-bend-${k}`, sphere(r).translate(pts[k][0], pts[k][1], pts[k][2]).color(colour));
};
// Profile in (y, z), extruded along x0..x1.
const prismX = (pts: number[][], x0: number, x1: number) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [y, z] of pts.slice(1)) pb = pb.lineTo(y, z);
  return pb.close().extrude(x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
};

const X = 660, Y = 340, Z0 = 760, ZR = 1120, T = 30; // tub half sizes, floor and rim heights, wall
const DOOR = 210; // half width of the walk-in door

// ---- Tub ----
const shell = blk(-X, -Y, Z0, X, Y, ZR)
  .subtract(blk(-X + T, -Y + T, Z0 + T, X - T, Y - T, ZR + 50))
  .subtract(blk(-DOOR, -Y - 50, Z0 + T, DOOR, -Y + T + 1, ZR + 50));
add('tub-shell', shell.color(tubSteel));
add('back-splash', blk(-X, Y - T, ZR, X, Y, 1480).color(tubSteel));
for (const s of [-1, 1]) {
  add(`side-splash-${s < 0 ? 'left' : 'right'}`, prismX([[-Y, ZR], [Y, ZR], [Y, 1480], [Y - 160, 1480], [-Y + 120, ZR + 120], [-Y, ZR + 120]], s * X - (s > 0 ? T : 0), s * X + (s < 0 ? T : 0)).color(tubSteel));
}
for (const s of [-1, 1]) add(`front-rim-${s < 0 ? 'left' : 'right'}`, blk(s * DOOR, -Y - 12, ZR - 6, s * X, -Y + T, ZR + 12).color(tubSteel));
add('floor-mat', blk(-X + T + 10, -Y + T + 10, Z0 + T, X - T - 10, Y - T - 10, Z0 + T + 14).color(mat));
for (let k = -5; k <= 5; k++) add(`mat-rib-${k}`, blk(k * 110 - 12, -Y + T + 20, Z0 + T + 14, k * 110 + 12, Y - T - 20, Z0 + T + 22).color(mat));
add('drain', cylZ(X - 120, Y - 110, Z0 + T + 14, 10, 40, 14).color('#8e989b'));
// Door swung open on its hinge at +DOOR.
add('door', blk(DOOR + 4, -Y - 2 * DOOR - 10, Z0 + T, DOOR + 30, -Y - 10, ZR).color(tubSteel));
add('door-latch', blk(DOOR + 30, -Y - 2 * DOOR + 10, Z0 + 260, DOOR + 46, -Y - 2 * DOOR + 40, Z0 + 300).color('#8e989b'));
add('door-gasket', blk(-DOOR - 8, -Y - 2, Z0 + T, -DOOR, -Y + T, ZR).color(hose));

// ---- Leg frame and shelf ----
for (const [i, x] of [-X + 50, X - 50].entries()) {
  for (const [j, y] of [-Y + 50, Y - 50].entries()) {
    add(`leg-${i}-${j}`, blk(x - 25, y - 25, 30, x + 25, y + 25, Z0).color(tubSteel));
    add(`foot-${i}-${j}`, cylZ(x, y, 0, 30, 32, 12).color(hose));
  }
}
add('shelf', blk(-X + 30, -Y + 30, 200, X - 30, Y - 30, 225).color(tubSteel));
add('towel-stack', blk(-X + 90, -Y + 90, 225, -X + 450, Y - 120, 330).color('#f1ede2'));
add('shampoo-jug', blk(X - 280, -60, 225, X - 140, 80, 480).color('#e8a33d'));
add('shampoo-cap', cylZ(X - 210, 10, 480, 40, 32, 12).color('#3a3d40'));

// ---- Tap, sprayer and hose ----
add('mixer-body', blk(-120, Y - T - 50, 1250, 120, Y - T, 1320).color(tubSteel));
for (const s of [-1, 1]) add(`tap-handle-${s < 0 ? 'hot' : 'cold'}`, blk(s * 120 - 60, Y - T - 70, 1285, s * 120 + 10, Y - T - 50, 1305).color(s < 0 ? '#c0392b' : '#3d6fb5'));
poly('gooseneck', [[0, Y - T - 25, 1320], [0, Y - T - 25, 1450], [0, Y - 150, 1500], [0, Y - 280, 1430], [0, Y - 300, 1350]], 16, tubSteel);
poly('sprayer-hose', [[0, Y - T - 25, 1250], [-200, Y - 110, 1180], [-430, Y - 120, 1250], [-500, Y - 90, 1380]], 12, hose);
add('sprayer-hook', blk(-540, Y - T - 30, 1360, -460, Y - T, 1390).color(tubSteel));
add('sprayer-head', tube([-500, Y - 90, 1380], [-500, Y - 120, 1470], 26, 12).color('#d9d9d2'));

// ---- Grooming arm with restraint loop ----
poly('grooming-arm', [[-X + 60, Y - 60, ZR], [-X + 60, Y - 60, 1880], [-X + 60, -40, 1880]], 18, tubSteel);
add('arm-clamp', blk(-X + 30, Y - 90, ZR - 40, -X + 90, Y - 30, ZR + 40).color('#8e989b'));
add('loop-strap', tube([-X + 60, -40, 1870], [-X + 60, -40, 1590], 8, 8).color(loop));
add('loop', torus(70, 9, 10).rotateY(90).translate(-X + 60, -40, 1520).color(loop));

// ---- Walk-up ramp ----
if (access.value === 'ramp') {
  const y0 = -Y - 1250, z1 = Z0 + T;
  add('ramp', prismX([[y0, 0], [-Y - 20, z1 - 40], [-Y - 20, z1], [y0, 40]], -DOOR + 20, DOOR - 20).color(tubSteel));
  const n = 10;
  for (let k = 1; k < n; k++) {
    const f = k / n, y = y0 + f * (-Y - 20 - y0), z = 40 + f * (z1 - 40);
    add(`ramp-cleat-${k}`, blk(-DOOR + 30, y - 12, z - 6, DOOR - 30, y + 12, z + 16).color(mat));
  }
  add('ramp-hook', blk(-DOOR + 20, -Y - 30, z1 - 10, DOOR - 20, -Y + 10, z1 + 10).color('#8e989b'));
}

return p.model();
