// October 2026 McGregor Roadster study model.
// Body stations: examples/roadster/stations.measured.json
// Nose and the pre-door hood follow official-01.jpg (luminance > 48).
// Width 2006.6 mm is the published 79 in. Length 4520, the cabin roof, and
// the axle positions are assumptions (not published). The open door and the
// raised rear wing are parts, not the body loft.
//
// Frame: mm, nose at x = 0, tail at x = 4520, +Z up, +Y left.

const STATIONS = [
  [0, 103, 70, 178, 50],
  [700, 6, 560, 276, 500],
  [1500, 160, 580, 810, 580],
  [2300, 150, 980, 1020, 1003.3],
  [2950, 160, 560, 900, 560],
  [3850, 190, 540, 970, 540],
  [4520, 320, 200, 720, 160],
];

const FRONT_R = (20 * 25.4 + 2 * 295 * 0.3) / 2;
const REAR_R = (21 * 25.4 + 2 * 335 * 0.3) / 2;
const FRONT_W = 295;
const REAR_W = 335;
const HALF_TRACK = 790;
const FRONT_AXLE = 1100;
const REAR_AXLE = 3400;

function section(row) {
  const zSill = row[1];
  const halfBottom = row[2];
  const zTop = row[3];
  const halfTop = row[4];
  const rise = Math.max(zTop - zSill, 1);
  const lip = Math.min(30, rise * 0.34);
  const crownDrop = Math.min(40, rise * 0.22);
  const zBelt = zSill + rise * 0.42;
  const halfBelt = halfBottom + (halfTop - halfBottom) * 0.55;
  const right = [
    [halfBottom, zSill],
    [halfBottom, zSill + lip],
    [halfBelt, zBelt],
    [halfTop, zTop - crownDrop],
    [halfTop * 0.45, zTop],
    [0, zTop],
  ];
  const pts = right.slice();
  for (let i = right.length - 2; i >= 0; i--) pts.push([-right[i][0], right[i][1]]);
  let pen = path().moveTo(-halfBottom, zSill);
  for (const [y, z] of pts) pen = pen.lineTo(y, z);
  return pen.close();
}

function loftStations(rows) {
  const pieces = [];
  for (let i = 0; i < rows.length - 1; i += 3) {
    const run = rows.slice(i, Math.min(i + 4, rows.length));
    const sketches = run.map(section);
    const planes = run.map((row) => ({ plane: 'YZ', origin: [row[0], 0, 0] }));
    pieces.push(sketches[0].loft(sketches.slice(1), { planes, ruled: true }));
  }
  return pieces.length === 1 ? pieces[0] : pieces[0].union(...pieces.slice(1));
}

const body = loftStations(STATIONS);

function diskY(radius, width) {
  return cylinder(width, radius).alongAxis([0, 1, 0]).translate(0, -width / 2, 0);
}

function placeDisk(radius, width, x, y, z) {
  return diskY(radius, width).translate(x, y, z);
}

// Upward-opening doors. Hinge is the local origin; the panel swings about X.
function openDoor(sign) {
  const panel = box(860, 34, 520).translate(0, sign > 0 ? 0 : -34, 0);
  return panel.rotate([1, 0, 0], sign > 0 ? -64 : 64, [0, sign > 0 ? 0 : -34, 0]);
}

function nozzleAlong(dir, length, radius) {
  return cylinder(length, radius).translate(0, 0, -length / 2).alongAxis(dir);
}

const car = assembly('roadster');

const chassisConnectors = {};
function pin(name, at) {
  chassisConnectors[name] = { origin: at, axis: [0, 0, 1] };
}
pin('light-front', [-30, 0, 140]);
pin('light-rear', [4588, 0, 560]);
pin('door-left', [1680, 1080, 900]);
pin('door-right', [1680, -1080, 900]);
pin('diffuser', [4200, 0, 80]);
pin('copv-a', [2500, 300, -20]);
pin('copv-b', [2500, -300, -20]);
for (const spec of [
  ['wheel-fl', FRONT_AXLE, 1, FRONT_R],
  ['wheel-fr', FRONT_AXLE, -1, FRONT_R],
  ['wheel-rl', REAR_AXLE, 1, REAR_R],
  ['wheel-rr', REAR_AXLE, -1, REAR_R],
]) {
  pin(spec[0], [spec[1], spec[2] * HALF_TRACK, spec[3]]);
}
for (const spec of [
  ['noz-rear-1', 4580, 360, 340],
  ['noz-rear-2', 4580, 140, 340],
  ['noz-rear-3', 4580, -140, 340],
  ['noz-rear-4', 4580, -360, 340],
  ['noz-down-fl', 1750, 520, 70],
  ['noz-down-fr', 1750, -520, 70],
  ['noz-down-rl', 2850, 520, 70],
  ['noz-down-rr', 2850, -520, 70],
]) {
  pin(spec[0], [spec[1], spec[2], spec[3]]);
}

const chassis = car.part('chassis', body, { density: 320, connectors: chassisConnectors });

function mount(name, shape, at, density) {
  return car.part(name, shape.translate(at[0], at[1], at[2]), {
    density,
    connectors: { mount: { origin: at, axis: [0, 0, 1] } },
    connect: {
      connector: 'mount',
      to: chassis.connector(name),
      name: name + '-fix',
    },
  });
}

mount('wheel-fl', placeDisk(FRONT_R, FRONT_W, 0, 0, 0), [FRONT_AXLE, HALF_TRACK, FRONT_R], 180);
mount('wheel-fr', placeDisk(FRONT_R, FRONT_W, 0, 0, 0), [FRONT_AXLE, -HALF_TRACK, FRONT_R], 180);
mount('wheel-rl', placeDisk(REAR_R, REAR_W, 0, 0, 0), [REAR_AXLE, HALF_TRACK, REAR_R], 160);
mount('wheel-rr', placeDisk(REAR_R, REAR_W, 0, 0, 0), [REAR_AXLE, -HALF_TRACK, REAR_R], 160);

mount('light-front', box(36, 1760, 28, true), [-30, 0, 140], 1200);
mount('light-rear', box(30, 1680, 22, true), [4588, 0, 560], 1200);
mount('door-left', openDoor(1), [1680, 1080, 900], 700);
mount('door-right', openDoor(-1), [1680, -1080, 900], 700);
mount('diffuser', box(700, 900, 60, true), [4200, 0, 80], 1400);

// Two bottles under the sill. Inner gas volume is pi * 0.12^2 * 1.40 m each.
function bottle() {
  const outer = cylinder(1400, 140).translate(0, 0, -700);
  const inner = cylinder(1420, 120).translate(0, 0, -710);
  return outer.subtract(inner).alongAxis([1, 0, 0]);
}
mount('copv-a', bottle(), [2500, 300, -20], 1600);
mount('copv-b', bottle(), [2500, -300, -20], 1600);

for (const [name, x, y, z] of [
  ['noz-rear-1', 4580, 360, 340],
  ['noz-rear-2', 4580, 140, 340],
  ['noz-rear-3', 4580, -140, 340],
  ['noz-rear-4', 4580, -360, 340],
]) {
  mount(name, nozzleAlong([1, 0, 0], 80, 28), [x, y, z], 4500);
}
for (const [name, x, y, z] of [
  ['noz-down-fl', 1750, 520, 70],
  ['noz-down-fr', 1750, -520, 70],
  ['noz-down-rl', 2850, 520, 70],
  ['noz-down-rr', 2850, -520, 70],
]) {
  mount(name, nozzleAlong([0, 0, -1], 60, 24), [x, y, z], 4500);
}

return car.solvedModel({});
