// SPDX-License-Identifier: CC0-1.0
// Transit concrete mixer truck: the ready-mix truck. What makes it one: a
// three-axle truck chassis with a forward cab, and on the back the big
// pear-shaped mixing drum lying tilted up toward the rear, carried on a front
// gearbox pedestal and a rear roller stand, with spiral-blade bands round the
// drum, the charge hopper over the rear opening, the curved discharge chute
// folded below it, and the operator ladder up the back.
// Generic visualization geometry at about real size (about 9.2 m long, 2.5 m
// wide, 3.9 m tall, 4.8 m drum), millimetres, Z up, cab toward +X, tyres on
// z = 0.
meta({
  name: "transit-mixer-truck",
  license: 'CC0-1.0',
  title: "Transit concrete mixer truck",
  description: "Transit concrete mixer truck at about real size: three-axle chassis with dual rear wheels, forward cab with windscreen, side windows, grille and bumper, tilted pear-shaped mixing drum with spiral-blade bands on a front gearbox pedestal and rear roller stand, charge hopper, curved discharge chute, rear ladder, water tank and fenders. Material controls: cab glass, equipment enamel paint, drum paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
  tags: ['transit mixer', 'concrete mixer truck', 'ready-mix truck', 'cement mixer', 'concrete', 'construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 6000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const cabGlassColor = param('cabGlassColor', '#77a4b0', { label: 'Cab glass' });
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel paint' });
const drumPaintColor = param('drumPaintColor', '#dfe2dc', { label: 'Mixing drum paint' });
const tireRubberColor = param('tireRubberColor', '#252a2d', { label: 'Tire and grip rubber' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Exposed structural steel' });
presets({
  weathered: { cabGlassColor: '#66858b', equipmentPaintColor: '#a87b36', drumPaintColor: '#a9a396', tireRubberColor: '#3a3a37', structuralSteelColor: '#716b61' },
  highVisibility: { cabGlassColor: '#91bdc6', equipmentPaintColor: '#f06b26', drumPaintColor: '#f2f2ec', tireRubberColor: '#292e31', structuralSteelColor: '#c1c7c2' },
});

const p = assembly('transit-mixer-truck');
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
// Tyre with rounded shoulders, plus a steel rim, on an axle along Y.
const wheel = (name, x, y, r, w) => {
  const tyre = turned([
    [r * 0.62, -w / 2], [r * 0.86, -w / 2], [r * 0.95, -w * 0.36], [r * 0.95, w * 0.36], [r * 0.86, w / 2], [r * 0.62, w / 2],
  ]);
  const rim = turned([[0, -w * 0.42], [r * 0.62, -w * 0.42], [r * 0.62, w * 0.42], [0, w * 0.42]]);
  add(`${name}-tyre`, tyre.rotateX(90).translate(x, y, r), tireRubberColor);
  add(`${name}-rim`, rim.rotateX(90).translate(x, y, r), structuralSteelColor);
  // Tread lugs across the crown, chevron-ish by alternating offset.
  for (let i = 0; i < 16; i++) {
    const a = (360 * i) / 16;
    const off = i % 2 ? w * 0.18 : -w * 0.18;
    add(`${name}-lug-${i}`, box(r * 0.16, w * 0.5, r * 0.07, true).translate(0, off, r * 0.965).rotateY(a).translate(x, y, r), tireRubberColor);
  }
};

// Front steer axle and dual-tyred rear tandem.
for (const s of [-1, 1]) {
  const tag = s > 0 ? 'left' : 'right';
  wheel(`front-wheel-${tag}`, 3500, s * 1000, 530, 320);
  wheel(`rear-wheel-${tag}-0`, -1250, s * 900, 530, 560);
  wheel(`rear-wheel-${tag}-1`, -2650, s * 900, 530, 560);
  add(`front-fender-${s}`, side(filletPolygon([[2900, 950], [4100, 950], [4100, 1120], [2900, 1120]], 30), 380, s * 1000), equipmentPaintColor);
  add(`rear-fender-${s}`, side([[-3300, 1130], [-600, 1130], [-600, 1180], [-3300, 1180]], 620, s * 900), structuralSteelColor);
  add(`mud-flap-${s}`, side([[-3360, 300], [-3320, 300], [-3320, 1180], [-3360, 1180]], 560, s * 900), tireRubberColor);
}

// Chassis rails, fuel tank and water tank.
add('chassis', side([[-3400, 780], [4300, 780], [4300, 1100], [-3400, 1100]], 900), structuralSteelColor);
add('fuel-tank', turned([[0, 0], [280, 0], [280, 900], [0, 900]]).rotateY(90).translate(1000, -720, 900), structuralSteelColor);
add('water-tank', turned([[0, 0], [380, 0], [380, 900], [0, 900]]).rotateX(90).translate(2350, 450, 1600), drumPaintColor);

// Forward cab with windscreen, side windows, grille and bumper.
add('cab', side(filletPolygon([[2550, 1000], [4450, 1000], [4500, 1700], [4330, 2950], [2550, 3000]], 90), 2440), equipmentPaintColor);
add('windscreen', side([[4360, 2000], [4440, 1980], [4330, 2850], [4250, 2860]], 2200), cabGlassColor);
for (const s of [-1, 1]) {
  add(`side-window-${s}`, side([[3500, 2050], [4280, 2050], [4180, 2780], [3500, 2800]], 20, s * 1225), cabGlassColor);
  add(`mirror-${s}`, side([[4450, 2100], [4520, 2100], [4520, 2550], [4450, 2550]], 60, s * 1330), tireRubberColor);
  add(`step-${s}`, side([[3500, 650], [3900, 650], [3900, 700], [3500, 700]], 200, s * 1150), structuralSteelColor);
  add(`headlamp-${s}`, front([[-140, -70], [140, -70], [140, 70], [-140, 70]], 20, 4510).translate(0, s * 900, 1450), cabGlassColor);
}
add('grille', front([[-650, 1200], [650, 1200], [650, 1750], [-650, 1750]], 30, 4510), structuralSteelColor);
add('bumper', side(filletPolygon([[4300, 600], [4650, 600], [4650, 950], [4300, 950]], 40), 2460), structuralSteelColor);
add('sun-visor', side([[4250, 2900], [4550, 2880], [4550, 2950], [4250, 3000]], 2300), equipmentPaintColor);

// Drum supports: front gearbox pedestal and rear roller stand.
add('front-pedestal', side([[2000, 1100], [2500, 1100], [2400, 1800], [2100, 1800]], 700), equipmentPaintColor);
add('gearbox', turned([[0, 0], [300, 0], [300, 250], [0, 250]]).rotateY(-77).translate(2380, 0, 1750), structuralSteelColor);
add('rear-stand', side([[-2550, 1100], [-1950, 1100], [-2150, 2300], [-2400, 2300]], 1800), equipmentPaintColor);
add('rear-stand-beam', side([[-2450, 1950], [-2150, 1950], [-2150, 2150], [-2450, 2150]], 2200), equipmentPaintColor);

// Pear-shaped mixing drum on an axis tilted up toward the rear.
const drumTilt = (s) => s.rotateY(-77).translate(2150, 0, 1750);
const drumProfile = [[0, 0], [450, 0], [1050, 900], [1150, 2100], [950, 3700], [470, 4700], [0, 4700]];
add('drum', drumTilt(turned(drumProfile)), drumPaintColor);
for (const [i, z0] of [600, 1500, 2400, 3300].entries()) {
  const r = z0 < 900 ? 450 + (600 * z0) / 900 : z0 < 2100 ? 1050 + ((z0 - 900) * 100) / 1200 : 1150 - ((z0 - 2100) * 200) / 1600;
  add(`drum-band-${i}`, drumTilt(turned([[r - 20, z0], [r + 30, z0], [r + 30, z0 + 160], [r - 20, z0 + 160]])), equipmentPaintColor);
}
add('drum-rim', drumTilt(turned([[300, 4650], [520, 4650], [520, 4760], [300, 4760]])), structuralSteelColor);
add('drum-track', drumTilt(turned([[1050, 2700], [1180, 2700], [1180, 2850], [1050, 2850]])), structuralSteelColor);

// Charge hopper, discharge chute and ladder at the rear.
add('hopper', turned([[180, 0], [240, 0], [620, 650], [560, 650]]).translate(-2950, 0, 2950), structuralSteelColor);
add('collector', side([[-3000, 2250], [-2650, 2250], [-2750, 2700], [-3100, 2700]], 600), structuralSteelColor);
add('chute', side(bar([[-2900, 2300], [-3250, 2050], [-3450, 1650], [-3500, 1300]], 160), 450), equipmentPaintColor);
for (const s of [-1, 1]) add(`chute-lip-${s}`, side(bar([[-2900, 2400], [-3300, 2120], [-3530, 1700], [-3590, 1300]], 60), 40, s * 240), equipmentPaintColor);
for (const s of [-1, 1]) add(`ladder-rail-${s}`, side(bar([[-3150, 900], [-2950, 3300]], 60), 50, s * 300), structuralSteelColor);
for (let i = 0; i < 7; i++) {
  const t = (i + 0.5) / 7;
  add(`ladder-rung-${i}`, front([[-300, -20], [300, -20], [300, 20], [-300, 20]], 40, -3150 + 200 * t).translate(0, 0, 900 + 2400 * t), structuralSteelColor);
}
add('ladder-platform', side([[-3100, 2850], [-2700, 2850], [-2700, 2900], [-3100, 2900]], 700), structuralSteelColor);

return p.model();
