// SPDX-License-Identifier: CC0-1.0
// Skid-steer loader: the compact four-wheel site loader steered by braking
// one side. What makes it one: four equal treaded wheels close together on a
// short boxy chassis, the operator cage sitting forward between them with a
// glazed front door, the engine bay behind it, and two lift arms pivoting on
// tall rear towers that run forward along the cage sides and drop to a
// full-width bucket on a quick-attach plate.
// Generic visualization geometry at about real size (about 3.5 m long with the
// bucket, 1.9 m wide, 2.1 m tall), millimetres, Z up, bucket toward +X, tyres
// on z = 0.
meta({
  name: "skid-steer-loader",
  license: 'CC0-1.0',
  title: "Skid-steer loader",
  description: "Skid-steer loader at about real size: four equal treaded wheels on a short chassis, forward operator cage with glazed door and side screens, rear engine bay with grille and tail lamps, two lift arms on tall rear towers with lift rams, and full-width bucket with steel cutting edge on a quick-attach plate. Material controls: cab glass, equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
  tags: ['skid-steer loader', 'skid steer', 'compact loader', 'bobcat', 'loader', 'construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 4500
});
const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const cabGlassColor = param('cabGlassColor', '#77a4b0', { label: 'Cab glass' });
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel paint' });
const tireRubberColor = param('tireRubberColor', '#252a2d', { label: 'Tire and grip rubber' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Exposed structural steel' });
presets({
  weathered: { cabGlassColor: '#66858b', equipmentPaintColor: '#a87b36', tireRubberColor: '#3a3a37', structuralSteelColor: '#716b61' },
  highVisibility: { cabGlassColor: '#91bdc6', equipmentPaintColor: '#f06b26', tireRubberColor: '#292e31', structuralSteelColor: '#c1c7c2' },
});

const p = assembly('skid-steer-loader');
const add = (name, shape, finish) => p.part(name, shape.scale(scale).color(finish));

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
// Hydraulic ram (barrel plus chrome rod) between two side-view points.
const ram = (name, [ax, az], [bx, bz], y, r) => {
  const len = Math.hypot(bx - ax, bz - az);
  const tilt = (Math.atan2(bx - ax, bz - az) * 180) / Math.PI;
  const place = (s) => s.rotateY(tilt).translate(ax, y, az);
  add(`${name}-barrel`, place(turned([[0, 0], [r, 0], [r, len * 0.55], [0, len * 0.55]])), equipmentPaintColor);
  add(`${name}-rod`, place(turned([[0, len * 0.5], [r * 0.5, len * 0.5], [r * 0.5, len], [0, len]])), structuralSteelColor);
};
// Tyre with rounded shoulders, plus a steel rim, on an axle along Y.
const wheel = (name, x, y, r, w) => {
  const tyre = turned([
    [r * 0.62, -w / 2], [r * 0.86, -w / 2], [r * 0.95, -w * 0.36], [r * 0.95, w * 0.36], [r * 0.86, w / 2], [r * 0.62, w / 2],
  ]);
  const rim = turned([[0, -w * 0.42], [r * 0.62, -w * 0.42], [r * 0.62, w * 0.42], [0, w * 0.42]]);
  add(`${name}-tyre`, tyre.rotateX(90).translate(x, y, r), tireRubberColor);
  add(`${name}-rim`, rim.rotateX(90).translate(x, y, r), equipmentPaintColor);
  // Tread lugs across the crown, chevron-ish by alternating offset.
  for (let i = 0; i < 16; i++) {
    const a = (360 * i) / 16;
    const off = i % 2 ? w * 0.18 : -w * 0.18;
    add(`${name}-lug-${i}`, box(r * 0.16, w * 0.5, r * 0.07, true).translate(0, off, r * 0.965).rotateY(a).translate(x, y, r), tireRubberColor);
  }
};

for (const x of [-570, 570]) {
  for (const s of [-1, 1]) wheel(`wheel-${x > 0 ? 'front' : 'rear'}-${s > 0 ? 'left' : 'right'}`, x, s * 760, 390, 320);
}

// Chassis tub with track-side skirts between the wheels.
add('chassis', side(filletPolygon([[-1250, 220], [880, 220], [960, 500], [900, 820], [-1250, 820]], 40), 1180), equipmentPaintColor);
for (const s of [-1, 1]) add(`side-skirt-${s}`, side([[-230, 260], [230, 260], [230, 600], [-230, 600]], 40, s * 600), structuralSteelColor);

// Engine bay behind the cage with rear grille and tail lamps.
add('engine-cover', side(filletPolygon([[-1300, 820], [-450, 820], [-450, 1350], [-1220, 1300]], 60), 1000), equipmentPaintColor);
add('rear-grille', front([[-400, 300], [400, 300], [400, 1150], [-400, 1150]], 30, -1300), structuralSteelColor);
for (let i = 0; i < 4; i++) add(`grille-slat-${i}`, front([[-380, 0], [380, 0], [380, 40], [-380, 40]], 20, -1320).translate(0, 0, 450 + i * 180), tireRubberColor);
for (const s of [-1, 1]) add(`tail-lamp-${s}`, front([[-60, -50], [60, -50], [60, 50], [-60, 50]], 20, -1310).translate(0, s * 470, 1000), cabGlassColor);
add('exhaust', turned([[0, 0], [35, 0], [35, 240], [0, 240]]).translate(-900, -300, 1300), structuralSteelColor);

// Operator cage: frame, front door glass, side screens and roof.
add('cage-glass', side([[-450, 820], [560, 820], [520, 1900], [-450, 1950]], 860), cabGlassColor);
for (const s of [-1, 1]) {
  add(`cage-side-frame-${s}`, side([[-470, 820], [580, 820], [540, 1980], [-470, 2030], [-470, 1900], [-380, 1880], [450, 1850], [470, 900], [-470, 900]], 40, s * 450), tireRubberColor);
  for (let i = 0; i < 4; i++) add(`side-screen-bar-${s}-${i}`, side([[-380, 0], [440, 0], [440, 30], [-380, 30]], 20, s * 455).translate(0, 0, 1100 + i * 190), tireRubberColor);
}
add('cage-roof', side(filletPolygon([[-560, 1940], [600, 1900], [600, 2030], [-560, 2080]], 30), 980), equipmentPaintColor);
add('door-frame', front([[-420, 860], [420, 860], [400, 1880], [-400, 1880], [-400, 1820], [340, 1820], [360, 920], [-360, 920], [-360, 1820], [-400, 1820]], 30, 560), tireRubberColor);
add('grab-handle', front(bar([[-300, 1300], [-300, 1600]], 30), 40, 600).translate(0, 0, 0), structuralSteelColor);

// Rear towers carrying the lift-arm pivots, lift arms and rams.
for (const s of [-1, 1]) {
  const y = s * 610;
  add(`tower-${s}`, side(filletPolygon([[-1300, 700], [-850, 700], [-900, 1750], [-1250, 1800]], 40), 140, y), equipmentPaintColor);
  add(`lift-arm-${s}`, side(bar([[-1080, 1680], [-500, 1950], [500, 1930], [1000, 1500], [1150, 750]], 170), 130, s * 590), equipmentPaintColor);
  add(`arm-pivot-${s}`, turned([[0, -90], [70, -90], [70, 90], [0, 90]]).rotateX(90).translate(-1080, s * 610, 1680), structuralSteelColor);
  ram(`lift-ram-${s}`, [-900, 900], [-150, 1850], s * 660, 55);
}
add('arm-cross-tube', turned([[0, -600], [60, -600], [60, 600], [0, 600]]).rotateX(90).translate(1000, 0, 1450), equipmentPaintColor);

// Quick-attach plate and full-width bucket.
add('quick-attach', side([[1100, 250], [1200, 250], [1200, 1100], [1100, 1100]], 1250), structuralSteelColor);
add('bucket', side([[1180, 900], [1300, 900], [1320, 330], [1420, 190], [1770, 140], [1780, 60], [1330, 90], [1200, 220]], 1900), equipmentPaintColor);
for (const s of [-1, 1]) add(`bucket-side-${s}`, side([[1200, 900], [1320, 900], [1430, 420], [1790, 140], [1300, 80], [1200, 220]], 30, s * 935), equipmentPaintColor);
add('bucket-edge', side([[1720, 0], [1860, 0], [1860, 60], [1720, 90]], 1900), structuralSteelColor);
add('bucket-ram', turned([[0, 0], [50, 0], [50, 600], [0, 600]]).rotateY(140).translate(1000, 0, 1450), structuralSteelColor);

return p.model();
