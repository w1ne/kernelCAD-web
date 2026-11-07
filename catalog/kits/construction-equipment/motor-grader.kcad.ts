// SPDX-License-Identifier: CC0-1.0
// Motor grader: the long road-shaping machine. What makes it one: a tandem
// pair of drive wheels each side under the rear engine, a tall glazed cab
// over the articulation, a long arched gooseneck frame running forward to a
// single steering axle with a push block, and slung under the frame mid-way
// the turntable circle carrying the long curved moldboard set at an angle to
// the direction of travel, hung on lift rams and pulled by a drawbar.
// Generic visualization geometry at about real size (about 8.9 m long, 2.6 m
// wide, 3.4 m tall, 3.7 m moldboard), millimetres, Z up, front axle toward
// +X, tyres on z = 0.
meta({
  name: "motor-grader",
  license: 'CC0-1.0',
  title: "Motor grader",
  description: "Motor grader at about real size: tandem rear drive wheels on bogie housings under the engine body, tall glazed cab, long arched gooseneck front frame to a single steering axle with push block, and a long curved moldboard angled across the machine on a turntable circle with drawbar and lift rams. Material controls: cab glass, equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
  tags: ['motor grader', 'road grader', 'grader', 'moldboard', 'road building', 'construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
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

const p = assembly('motor-grader');
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

// Tandem rear wheels and the single front steering axle.
for (const s of [-1, 1]) {
  const tag = s > 0 ? 'left' : 'right';
  wheel(`rear-wheel-${tag}-0`, -3500, s * 1020, 760, 420);
  wheel(`rear-wheel-${tag}-1`, -1900, s * 1020, 760, 420);
  wheel(`front-wheel-${tag}`, 3650, s * 1020, 760, 420);
  add(`tandem-housing-${tag}`, side(filletPolygon([[-3700, 520], [-1700, 520], [-1650, 1000], [-3750, 1000]], 80), 260, s * 680), equipmentPaintColor);
}
add('front-axle', turned([[0, -900], [90, -900], [90, 900], [0, 900]]).rotateX(90).translate(3650, 0, 760), structuralSteelColor);
add('front-axle-beam', side([[3500, 760], [3800, 760], [3800, 1000], [3500, 1000]], 1500), equipmentPaintColor);
add('push-block', side(filletPolygon([[3900, 450], [4250, 450], [4250, 1150], [3900, 1150]], 40), 1200), structuralSteelColor);
add('headlight-bar', front([[-700, 0], [700, 0], [700, 60], [-700, 60]], 60, 3780).translate(0, 0, 1650), structuralSteelColor);
for (const s of [-1, 1]) add(`headlamp-${s}`, front([[-80, -60], [80, -60], [80, 60], [-80, 60]], 30, 3830).translate(0, s * 600, 1740), cabGlassColor);

// Rear engine body and main frame.
add('rear-frame', side([[-4400, 900], [-500, 900], [-500, 1200], [-4400, 1200]], 1100), structuralSteelColor);
add('engine-body', side(filletPolygon([[-4400, 1150], [-1500, 1150], [-1500, 2100], [-4000, 2200], [-4400, 1900]], 80), 1500), equipmentPaintColor);
add('rear-grille', front([[-550, 1250], [550, 1250], [550, 1850], [-550, 1850]], 30, -4410), structuralSteelColor);
for (const s of [-1, 1]) add(`rear-fender-${s}`, side([[-4100, 1550], [-1300, 1550], [-1300, 1600], [-4100, 1600]], 560, s * 1020), equipmentPaintColor);
add('exhaust-stack', turned([[0, 0], [70, 0], [70, 900], [85, 940], [0, 940]]).translate(-2500, -400, 2120), structuralSteelColor);
add('rear-ripper-bar', side([[-4900, 350], [-4600, 350], [-4600, 900], [-4900, 900]], 1900), equipmentPaintColor);
for (let i = 0; i < 3; i++) add(`ripper-shank-${i}`, side([[-4850, 900], [-4700, 900], [-4700, 150], [-4780, 0], [-4880, 200]], 90, -700 + i * 700), structuralSteelColor);

// Cab over the articulation.
add('cab-base', side([[-1500, 1150], [0, 1150], [0, 1550], [-1500, 1550]], 1600), equipmentPaintColor);
add('cab-glass', side([[-1420, 1550], [-60, 1550], [80, 3150], [-1380, 3200]], 1500), cabGlassColor);
for (const [x0, x1] of [[-1480, -1380], [-100, 0]]) {
  for (const s of [-1, 1]) {
    add(`cab-post-${x0}-${s}`, side([[x0, 1550], [x1, 1550], [x1 + 140, 3230], [x0 + 140, 3230]], 90, s * 760), equipmentPaintColor);
  }
}
add('cab-roof', side(filletPolygon([[-1600, 3200], [300, 3200], [250, 3380], [-1550, 3380]], 50), 1720), equipmentPaintColor);
add('beacon', turned([[0, 0], [70, 0], [60, 120], [0, 140]]).translate(-700, 0, 3380), equipmentPaintColor);

// Arched gooseneck frame running forward to the front axle.
add('gooseneck', side(bar([[-300, 1300], [600, 1900], [1500, 2050], [2900, 2000], [3500, 1600], [3650, 1050]], 380), 460), equipmentPaintColor);
add('frame-cap', side([[-600, 1150], [100, 1150], [100, 1500], [-600, 1500]], 600), structuralSteelColor);

// Drawbar, turntable circle, lift rams and the angled moldboard.
add('drawbar', side(bar([[3450, 1400], [2300, 1150], [1000, 1000]], 140), 900), structuralSteelColor);
add('circle', turned([[780, 940], [920, 940], [920, 1020], [780, 1020]]).translate(1000, 0, 0), structuralSteelColor);
add('circle-drive', turned([[0, 1020], [240, 1020], [240, 1260], [0, 1260]]).translate(1000, 0, 0), equipmentPaintColor);
for (const s of [-1, 1]) {
  ram(`lift-ram-${s}`, [1050, 1980], [1000, 950], s * 820, 70);
  add(`moldboard-hanger-${s}`, side([[950, 520], [1150, 520], [1080, 960], [930, 960]], 80, s * 780), structuralSteelColor);
}
ram('sideshift-ram', [1200, 2000], [1500, 980], 0, 50);
// Moldboard: curved blade in its own frame (length along Y), then angled.
const arc = [];
for (let i = 0; i <= 8; i++) {
  const a = ((235 - (i * 110) / 8) * Math.PI) / 180;
  arc.push([520 * Math.cos(a), 360 + 520 * Math.sin(a)]);
}
const moldboard = side(bar(arc, 50), 3700);
const cuttingEdge = side([[-345, -100], [-245, -100], [-260, 10], [-360, 10]], 3700);
const blade = (s) => s.rotateZ(30).translate(1250, 0, 100);
add('moldboard', blade(moldboard), equipmentPaintColor);
add('moldboard-edge', blade(cuttingEdge), structuralSteelColor);
for (const e of [-1, 1]) add(`moldboard-end-bit-${e}`, blade(side([[-380, -100], [-160, -100], [-200, 120], [-380, 100]], 50, e * 1860)), structuralSteelColor);

return p.model();
