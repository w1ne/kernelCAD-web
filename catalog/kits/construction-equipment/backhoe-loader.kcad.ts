// SPDX-License-Identifier: CC0-1.0
// Backhoe loader: the two-ended site tractor. What makes it one: big rear
// wheels and small front wheels under a long sloping engine hood, a glazed
// four-post cab between them, a full-width loader bucket on two curved lift
// arms at the front, and at the back a swing post carrying the bent boom,
// dipper and toothed digging bucket, braced by two splayed stabiliser legs
// with ground pads.
// Generic visualization geometry at about real size (about 7.6 m long in the
// digging pose shown, 2.35 m wide, 3.6 m tall), millimetres, Z up, loader
// bucket toward +X, wheels on z = 0.
meta({
  name: "backhoe-loader",
  license: 'CC0-1.0',
  title: "Backhoe loader",
  description: "Backhoe loader at about real size: large rear and small front wheels, sloping engine hood with exhaust stack, glazed four-post cab, full-width front loader bucket on curved lift arms, rear swing post with bent boom, dipper and toothed digging bucket, and two splayed stabiliser legs with pads. Material controls: cab glass, equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
  tags: ['backhoe loader', 'backhoe', 'digger', 'loader', 'excavation', 'construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 6000
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

const p = assembly('backhoe-loader');
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

const rearX = -700;
const frontX = 1500;
for (const s of [-1, 1]) {
  wheel(`rear-wheel-${s > 0 ? 'left' : 'right'}`, rearX, s * 925, 780, 500);
  wheel(`front-wheel-${s > 0 ? 'left' : 'right'}`, frontX, s * 960, 530, 340);
}

// Main frame and sloping engine hood.
add('frame', side([[-1900, 650], [2250, 650], [2250, 950], [-1900, 950]], 900), structuralSteelColor);
add('hood', side(filletPolygon([[300, 950], [2250, 950], [2300, 1350], [2150, 1520], [300, 1640]], 60), 960), equipmentPaintColor);
add('grille', front([[-400, 1000], [400, 1000], [400, 1380], [-400, 1380]], 30, 2300), structuralSteelColor);
for (const s of [-1, 1]) add(`headlamp-${s}`, front([[-90, -60], [90, -60], [90, 60], [-90, 60]], 20, 2330).translate(0, s * 330, 1450), cabGlassColor);
add('exhaust-stack', turned([[0, 0], [60, 0], [60, 950], [70, 990], [0, 990]]).translate(700, 300, 1600), structuralSteelColor);
add('air-intake', turned([[0, 0], [80, 0], [80, 500], [110, 520], [110, 640], [0, 640]]).translate(700, -300, 1600), structuralSteelColor);

// Fenders: arched bands over the rear wheels and flat guards over the fronts.
const arch = (cx, cz, r0, r1, a0, a1, n) => {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([cx + r1 * Math.cos(a), cz + r1 * Math.sin(a)]);
  }
  for (let i = n; i >= 0; i--) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([cx + r0 * Math.cos(a), cz + r0 * Math.sin(a)]);
  }
  return pts;
};
for (const s of [-1, 1]) {
  add(`rear-fender-${s}`, side(arch(rearX, 780, 830, 880, 10, 170, 10), 560, s * 925), equipmentPaintColor);
  add(`front-fender-${s}`, side(arch(frontX, 530, 580, 620, 30, 150, 6), 380, s * 960), equipmentPaintColor);
}

// Cab: floor deck, glazing, four painted posts and an overhanging roof.
add('cab-deck', side([[-1250, 950], [350, 950], [350, 1150], [-1250, 1150]], 2100), equipmentPaintColor);
add('cab-glass', side([[-1100, 1150], [300, 1150], [360, 2700], [-1050, 2750]], 1560), cabGlassColor);
for (const [x0, x1] of [[-1140, -1060], [280, 360]]) {
  for (const s of [-1, 1]) {
    add(`cab-post-${x0}-${s}`, side([[x0, 1150], [x1, 1150], [x1 + 40, 2780], [x0 + 20, 2780]], 90, s * 790), equipmentPaintColor);
  }
}
add('cab-roof', side(filletPolygon([[-1250, 2760], [500, 2760], [450, 2950], [-1200, 2960]], 50), 1800), equipmentPaintColor);
add('cab-step', side([[-300, 750], [100, 750], [100, 800], [-300, 800]], 260, -1150), structuralSteelColor);
add('beacon', turned([[0, 0], [70, 0], [60, 120], [0, 140]]).translate(-400, 0, 2960), equipmentPaintColor);

// Front loader: two curved lift arms, a cross tube, rams and the bucket.
const loaderArm = [[200, 1500], [900, 1700], [1700, 1550], [2500, 1150], [2850, 800]];
for (const s of [-1, 1]) {
  add(`lift-arm-${s}`, side(bar(loaderArm, 190), 110, s * 610), equipmentPaintColor);
  ram(`lift-ram-${s}`, [600, 1050], [1650, 1500], s * 520, 70);
}
add('arm-cross-tube', turned([[0, -620], [80, -620], [80, 620], [0, 620]]).rotateX(90).translate(2350, 0, 1230), equipmentPaintColor);
add('loader-bucket', side([[2780, 1380], [2930, 1380], [2960, 640], [3060, 450], [3460, 300], [3480, 210], [3000, 300], [2860, 520]], 2350), equipmentPaintColor);
add('loader-cutting-edge', side([[3440, 200], [3580, 200], [3580, 270], [3440, 300]], 2350), structuralSteelColor);
for (const s of [-1, 1]) add(`loader-bucket-side-${s}`, side([[2800, 1380], [2960, 1380], [3080, 520], [3500, 230], [2900, 330]], 40, s * 1180), equipmentPaintColor);

// Rear swing post, bent boom, dipper and digging bucket.
add('swing-frame', side([[-2250, 800], [-1800, 800], [-1800, 1500], [-2250, 1500]], 700), structuralSteelColor);
add('swing-post', side(filletPolygon([[-2550, 750], [-2200, 750], [-2150, 1700], [-2600, 1650]], 60), 420), equipmentPaintColor);
const boom = [[-2380, 1500], [-2600, 2500], [-2950, 3350], [-3500, 3550]];
add('boom', side(bar(boom, 300), 260), equipmentPaintColor);
const dipper = [[-3480, 3700], [-3700, 2500], [-3900, 1300], [-4000, 900]];
add('dipper', side(bar(dipper, 220), 200), equipmentPaintColor);
ram('boom-ram', [-2200, 1250], [-2850, 2950], 0, 85);
ram('dipper-ram', [-2950, 3500], [-3500, 3900], 0, 70);
add('dipper-ram-mount', side([[-3000, 3350], [-3500, 3500], [-3480, 3950], [-3300, 3900]], 120), equipmentPaintColor);
add('dig-bucket', side([[-3850, 1050], [-4150, 950], [-4350, 650], [-4300, 300], [-4050, 120], [-3950, 300], [-4100, 500], [-3950, 800]], 600), equipmentPaintColor);
for (let i = 0; i < 5; i++) {
  add(`dig-tooth-${i}`, side([[-4060, 160], [-3940, 40], [-3990, 200]], 60, -240 + i * 120), structuralSteelColor);
}
ram('bucket-ram', [-3600, 3300], [-3920, 1300], 0, 60);

// Stabiliser legs splayed out to ground pads.
for (const s of [-1, 1]) {
  add(`stabiliser-${s}`, front([[s * 950, 1400], [s * 1150, 1400], [s * 1520, 140], [s * 1340, 140]], 220, -2050), equipmentPaintColor);
  add(`stabiliser-pad-${s}`, front([[s * 1250, 0], [s * 1650, 0], [s * 1650, 140], [s * 1250, 140]], 480, -2050), structuralSteelColor);
}

return p.model();
