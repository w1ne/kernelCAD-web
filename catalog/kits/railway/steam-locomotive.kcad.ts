// SPDX-License-Identifier: CC0-1.0
// Steam locomotive: a 4-6-0 tender engine. What makes it one: a long round
// boiler ending in a black smokebox with a flared chimney, a brass steam dome
// and safety valves on top, a square firebox and a cab with side cut-outs at
// the back, three pairs of tall spoked driving wheels joined by a coupling rod
// and driven by a main rod from outside cylinders, a four-wheel leading bogie,
// a slatted cowcatcher, and a coal-heaped tender coupled behind.
// Generic visualization geometry at about real size (about 17.5 m over engine
// and tender, 3.0 m wide, 4.4 m tall, 1.72 m drivers on standard gauge),
// millimetres, Z up, chimney toward +X, wheel flanges on z = 0
// (rail top 35 mm up).
meta({
  name: "steam-locomotive",
  license: 'CC0-1.0',
  title: "Steam locomotive",
  description: "Steam 4-6-0 tender locomotive at about real size: round boiler with brass bands and handrails, black smokebox with door and flared chimney, brass steam dome and safety valves, Belpaire firebox, cab with side cut-outs, spectacle windows and arched roof, three pairs of spoked driving wheels with counterweights, coupling and main rods, outside cylinders with slide bars and crosshead, four-wheel leading bogie, slatted cowcatcher, buffer beam and headlamp, and a tender with a coal heap on two bogies. Material controls: rail and running gear steel, livery paint, smokebox black, brass, glazing; weathered, freshService and brunswickGreen presets.",
  tags: ["steam locomotive", "steam engine", "4-6-0", "tender locomotive", "heritage railway", "railway", "train", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 12000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#626b70', { label: 'Rail and running gear steel' });
const paintedSteel = param('paintedSteel', '#914337', { label: 'Livery paint' });
const smokeboxBlack = param('smokeboxBlack', '#25282a', { label: 'Smokebox and frame black' });
const brass = param('brass', '#c29b46', { label: 'Brass' });
const glass = param('glass', '#54a6bb', { label: 'Glazing' });
presets({
  weathered: { railSteel: '#666a6a', paintedSteel: '#884d40', smokeboxBlack: '#3a3836', brass: '#ac8d4b', glass: '#5a99a7' },
  freshService: { railSteel: '#56636a', paintedSteel: '#b74734', smokeboxBlack: '#1c1e20', brass: '#d3aa4d', glass: '#68b9ca' },
  brunswickGreen: { railSteel: '#5c6366', paintedSteel: '#1f5a3a', smokeboxBlack: '#202224', brass: '#d0a84e', glass: '#62aec0' },
});

const p = assembly("steam-locomotive");
// Lifted so the wheel flanges (35 mm below the rail top) rest on z = 0.
const flange = 35;
const add = (name, shape) => p.part(name, shape.translate(0, 0, flange).scale(scale));

// Side outline [[x, z], ...] extruded across Y, centred on y0.
const side = (pts, t, y0 = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2 + y0, 0);
// Front outline [[y, z], ...] extruded along X, centred on x0.
const front = (pts, t, x0 = 0) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0 - t / 2, 0, 0);
// A bent bar of width w following a centreline [[x, z], ...].
const bar = (line, w) => {
  const left = [];
  const right = [];
  line.forEach(([x, z], i) => {
    const [ax, az] = line[Math.max(0, i - 1)];
    const [bx, bz] = line[Math.min(line.length - 1, i + 1)];
    const len = Math.hypot(bx - ax, bz - az);
    const nx = -(bz - az) / len;
    const nz = (bx - ax) / len;
    left.push([x + (nx * w) / 2, z + (nz * w) / 2]);
    right.push([x - (nx * w) / 2, z - (nz * w) / 2]);
  });
  return [...left, ...right.reverse()];
};
// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Turned profile laid along +X starting at x0, on the axis (y, z).
const alongX = (pts, x0, y, z) => turned(pts).rotateY(90).translate(x0, y, z);
const circle = (r, n = 10) => Array.from({ length: n }, (_, i) => {
  const a = (2 * Math.PI * i) / n;
  return [r * Math.cos(a), r * Math.sin(a)];
});
// Round rod between two points.
const tube = (p0, p1, r = 20, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

// Flanged railway wheel on an axle along Y, tread on the rail at y = s * 750.
// Built in the XY plane with the outer face at z = 0, then turned to face out.
const toSide = (shape, x, s, r) => (s > 0 ? shape.rotateX(90) : shape.rotateX(-90)).translate(x, s * 790, r);
const wheel = (name, x, s, r, spokes) => {
  add(`${name}-tyre`, toSide(turned([[r - 90, 0], [r, 0], [r, 110], [r + 35, 118], [r + 35, 140], [r - 90, 140]]), x, s, r).color(railSteel));
  add(`${name}-boss`, toSide(turned([[0, -30], [r * 0.2, -30], [r * 0.22, 120], [0, 120]]), x, s, r).color(spokes ? paintedSteel : railSteel));
  if (!spokes) {
    add(`${name}-disc`, toSide(turned([[0, 50], [r - 80, 50], [r - 80, 90], [0, 90]]), x, s, r).color(railSteel));
    return;
  }
  add(`${name}-web`, toSide(turned([[0, 90], [r - 80, 90], [r - 80, 110], [0, 110]]), x, s, r).color(smokeboxBlack));
  for (let i = 0; i < spokes; i++) {
    const a = (360 * i) / spokes;
    add(`${name}-spoke-${i}`, toSide(box(r * 0.72, 46, 70, true).translate(r * 0.55, 0, 55).rotateZ(a), x, s, r).color(paintedSteel));
  }
  // Crescent counterweight opposite the crank.
  const cw = [];
  for (let i = 0; i <= 8; i++) {
    const a = ((110 + (140 * i) / 8) * Math.PI) / 180;
    cw.push([(r - 90) * Math.cos(a), (r - 90) * Math.sin(a)]);
  }
  for (let i = 8; i >= 0; i--) {
    const a = ((125 + (110 * i) / 8) * Math.PI) / 180;
    cw.push([r * 0.45 * Math.cos(a), r * 0.45 * Math.sin(a)]);
  }
  add(`${name}-counterweight`, toSide(extrudePolygon(cw, 60).translate(0, 0, 20).rotateZ(-30), x, s, r).color(paintedSteel));
};

// ---- Engine ----
const driverR = 860;
const drivers = [-2700, -700, 1300];
const crank = [driverR * 0.42 * Math.cos(Math.PI / 6), -driverR * 0.42 * Math.sin(Math.PI / 6)];
for (const s of [-1, 1]) {
  const tag = s > 0 ? 'left' : 'right';
  drivers.forEach((x, i) => wheel(`driver-${i}-${tag}`, x, s, driverR, 14));
  [3900, 5200].forEach((x, i) => wheel(`bogie-wheel-${i}-${tag}`, x, s, 480, 0));
  add(`bogie-frame-${tag}`, side([[3500, 380], [5600, 380], [5500, 620], [3600, 620]], 60, s * 880).color(smokeboxBlack));
  // Main frames inside the wheels.
  add(`frame-${tag}`, side([[-3600, 650], [6200, 650], [6200, 1350], [4400, 1350], [4200, 1250], [-3600, 1250]], 50, s * 560).color(smokeboxBlack));
  // Crank pins, coupling rod and main rod outside the drivers.
  drivers.forEach((x, i) => add(`crank-pin-${i}-${tag}`, tube([x + crank[0], s * 800, driverR + crank[1]], [x + crank[0], s * 1010, driverR + crank[1]], 60, 10).color(railSteel)));
  add(`coupling-rod-${tag}`, side(bar([[drivers[0] + crank[0], driverR + crank[1]], [drivers[2] + crank[0], driverR + crank[1]]], 120), 50, s * 950).color(railSteel));
  const crosshead = [3200, 1150];
  add(`main-rod-${tag}`, side(bar([[drivers[1] + crank[0], driverR + crank[1]], crosshead], 130), 50, s * 1010).color(railSteel));
  add(`crosshead-${tag}`, side([[3050, 1030], [3350, 1030], [3350, 1270], [3050, 1270]], 120, s * 1040).color(railSteel));
  for (const dz of [-150, 150]) add(`slide-bar-${tag}-${dz}`, side([[2900, 1150 + dz - 25], [4200, 1150 + dz - 25], [4200, 1150 + dz + 25], [2900, 1150 + dz + 25]], 80, s * 1040).color(railSteel));
  // Outside cylinder with valve chest and covers.
  add(`cylinder-${tag}`, alongX([[0, 0], [330, 0], [330, 1000], [0, 1000]], 4150, s * 1060, 1150).color(smokeboxBlack));
  for (const x0 of [4120, 5130]) add(`cylinder-cover-${tag}-${x0}`, alongX([[0, 0], [350, 0], [350, 40], [0, 40]], x0, s * 1060, 1150).color(railSteel));
  add(`valve-chest-${tag}`, side([[4200, 1400], [5100, 1400], [5100, 1750], [4200, 1750]], 420, s * 1000).color(smokeboxBlack));
  add(`steam-pipe-${tag}`, tube([4650, s * 940, 1740], [4850, s * 700, 2450], 110, 10).color(smokeboxBlack));
  // Sand box splashers over the drivers along the running board.
  drivers.forEach((x, i) => add(`splasher-${i}-${tag}`, side(filletPolygon([[x - 960, 1820], [x + 960, 1820], [x + 760, 1960], [x - 760, 1960]], 40), 160, s * 1300).color(paintedSteel)));
  // Boiler handrails.
  add(`handrail-${tag}`, tube([-1450, s * 900, 3050], [5500, s * 900, 3050], 22, 8).color(brass));
}

// Running board: high over the drivers, dropping ahead of them to the buffer beam.
add('running-board', side(bar([[-3600, 1820], [2300, 1820], [2800, 1380], [6200, 1380]], 70), 2900).color(smokeboxBlack));
for (const s of [-1, 1]) add(`valance-${s}`, side(bar([[-3600, 1740], [2300, 1740], [2800, 1300], [6200, 1300]], 140), 30, s * 1440).color(paintedSteel));
add('buffer-beam', side([[6200, 1000], [6380, 1000], [6380, 1450], [6200, 1450]], 2900).color(paintedSteel));
for (const s of [-1, 1]) {
  add(`buffer-stock-${s}`, alongX([[0, 0], [130, 0], [110, 300], [0, 300]], 6380, s * 870, 1150).color(smokeboxBlack));
  add(`buffer-head-${s}`, alongX([[0, 0], [220, 0], [220, 60], [0, 60]], 6680, s * 870, 1150).color(railSteel));
}
add('coupling-hook', side([[6380, 1100], [6760, 1100], [6760, 1220], [6380, 1220]], 90).color(railSteel));
// Slatted cowcatcher, raked forward and swept back in plan.
for (let i = -5; i <= 5; i++) {
  const y = i * 240;
  add(`cowcatcher-slat-${i + 5}`, tube([6380, y, 1000], [7150, y * 0.25, 150], 35, 6).color(railSteel));
}
add('cowcatcher-top', tube([6400, -1300, 1000], [6400, 1300, 1000], 50, 8).color(railSteel));
add('cowcatcher-toe', tube([7150, -350, 150], [7150, 350, 150], 50, 8).color(railSteel));

// Boiler with bands, smokebox, door, chimney, domes and safety valves.
const boilerZ = 2750;
add('boiler', alongX([[0, 0], [850, 0], [850, 5800], [0, 5800]], -1500, 0, boilerZ).color(paintedSteel));
for (const x of [-1000, 500, 2000, 3500]) add(`boiler-band-${x}`, alongX([[0, 0], [870, 0], [870, 80], [0, 80]], x, 0, boilerZ).color(brass));
add('smokebox', alongX([[0, 0], [900, 0], [900, 1300], [0, 1300]], 4300, 0, boilerZ).color(smokeboxBlack));
add('smokebox-saddle', side([[4400, 1380], [5500, 1380], [5500, 2400], [4400, 2400]], 1200).color(smokeboxBlack));
add('smokebox-door', alongX([[0, 0], [780, 0], [740, 60], [500, 130], [0, 160]], 5600, 0, boilerZ).color(smokeboxBlack));
add('door-ring', alongX([[700, 0], [800, 0], [800, 40], [700, 40]], 5580, 0, boilerZ).color(railSteel));
add('number-plate', alongX([[0, 0], [190, 0], [190, 30], [0, 30]], 5740, 0, boilerZ + 330).color(brass));
add('door-dart', tube([5780, -260, boilerZ - 60], [5780, 260, boilerZ - 60], 26, 6).color(railSteel));
add('chimney', turned([[0, 0], [380, 0], [270, 200], [250, 650], [330, 820], [340, 900], [0, 900]]).translate(5000, 0, 3480).color(smokeboxBlack));
add('chimney-cap', turned([[250, 880], [360, 880], [360, 940], [250, 940]]).translate(5000, 0, 3480).color(brass));
add('steam-dome', turned([[0, 0], [430, 0], [430, 360], [380, 500], [240, 600], [0, 630]]).translate(1500, 0, 3450).color(brass));
add('sand-dome', turned([[0, 0], [380, 0], [380, 260], [320, 390], [0, 440]]).translate(-200, 0, 3460).color(paintedSteel));
add('safety-valve-base', turned([[0, 0], [300, 0], [300, 150], [0, 150]]).translate(-2200, 0, 3550).color(brass));
for (const dx of [-110, 110]) add(`safety-valve-${dx}`, turned([[0, 0], [70, 0], [70, 240], [95, 270], [0, 280]]).translate(-2200 + dx, 0, 3690).color(brass));
add('whistle', turned([[0, 0], [40, 0], [40, 120], [70, 140], [70, 340], [0, 360]]).translate(-2550, 0, 3700).color(brass));
add('headlamp', side([[5750, 3450], [6050, 3450], [6050, 3780], [5750, 3780]], 300).color(smokeboxBlack));
add('headlamp-lens', alongX([[0, 0], [110, 0], [110, 20], [0, 20]], 6050, 0, 3615).color(glass));

// Belpaire firebox and cab with side cut-outs, spectacle windows and arched roof.
add('firebox', front([[-1050, 1820], [1050, 1820], [1050, 3350], [820, 3600], [-820, 3600], [-1050, 3350]], 1500, -2250).color(paintedSteel));
const cabShell = side([[-3700, 1820], [-2650, 1820], [-2650, 3950], [-3700, 3950]], 2900)
  .subtract(side([[-3800, 1880], [-2730, 1880], [-2730, 3880], [-3800, 3880]], 2740))
  .subtract(side([[-3600, 2500], [-3000, 2500], [-3000, 3500], [-3600, 3500]], 3200))
  .subtract(side([[-3600, 1880], [-3150, 1880], [-3150, 2500], [-3600, 2500]], 3200));
add('cab', cabShell.color(paintedSteel));
add('cab-roof', front([[-1580, 3940], [1580, 3940], [1300, 4180], [700, 4300], [-700, 4300], [-1300, 4180]], 1500, -3200).color(smokeboxBlack));
for (const s of [-1, 1]) {
  add(`spectacle-${s}`, alongX([[0, 0], [270, 0], [270, 24], [0, 24]], -2665, s * 1150, 3500).color(glass));
  add(`spectacle-frame-${s}`, alongX([[270, 0], [320, 0], [320, 40], [270, 40]], -2680, s * 1150, 3500).color(brass));
  add(`cab-grab-${s}`, tube([-3620, s * 1470, 2000], [-3620, s * 1470, 3300], 22, 6).color(brass));
}
add('fall-plate', side([[-3900, 1790], [-3600, 1790], [-3600, 1830], [-3900, 1830]], 1600).color(railSteel));

// ---- Tender ----
for (const s of [-1, 1]) {
  const tag = s > 0 ? 'left' : 'right';
  [-9900, -8700, -6000, -4800].forEach((x, i) => wheel(`tender-wheel-${i}-${tag}`, x, s, 480, 0));
  for (const x0 of [-9300, -5400]) add(`tender-bogie-${x0}-${tag}`, side([[x0 - 1000, 400], [x0 + 1000, 400], [x0 + 850, 760], [x0 - 850, 760]], 80, s * 880).color(smokeboxBlack));
}
add('tender-frame', side([[-10500, 900], [-3900, 900], [-3900, 1250], [-10500, 1250]], 2600).color(smokeboxBlack));
add('tender-tank', side([[-10400, 1250], [-3950, 1250], [-3950, 3200], [-10400, 3200]], 2900).color(paintedSteel));
add('tender-coping', side(bar([[-10400, 3250], [-6200, 3250], [-5900, 3500], [-3950, 3500]], 90), 3000)
  .subtract(side([[-10300, 3000], [-4050, 3000], [-4050, 3700], [-10300, 3700]], 2800)).color(paintedSteel));
add('coal-heap', side([[-6700, 3150], [-4000, 3150], [-4000, 3500], [-4400, 3880], [-5100, 4010], [-5900, 3920], [-6500, 3600]], 2700).color(smokeboxBlack));
add('water-filler', turned([[0, 0], [300, 0], [300, 180], [0, 180]]).translate(-9200, 0, 3200).color(brass));
add('tender-buffer-beam', side([[-10650, 900], [-10500, 900], [-10500, 1350], [-10650, 1350]], 2900).color(paintedSteel));
for (const s of [-1, 1]) {
  add(`tender-buffer-${s}`, alongX([[0, 0], [130, 0], [110, 300], [0, 300]], -10950, s * 870, 1150).color(smokeboxBlack));
  add(`tender-grab-${s}`, tube([-10430, s * 1460, 1400], [-10430, s * 1460, 2900], 22, 6).color(brass));
}
add('tender-ladder', side(bar([[-10440, 1300], [-10440, 3200]], 40), 600).color(railSteel));

return p.model();
