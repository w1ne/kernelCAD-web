// SPDX-License-Identifier: CC0-1.0
// Rear-mount aerial ladder truck. What makes it one is the turntable at the
// back of the body carrying a long two-section truss ladder, raised and
// extended forward over a custom flat-face crew cab, with the body standing
// on four outrigger jacks pushed out to the sides on round ground pads. The
// cab has a raised crew roof, sloped windshield, light bar and chrome
// bumper; the body has roll-up locker doors between the wheel arches and a
// reflective stripe; the chassis runs on a single front axle and tandem rear
// duals. Generic visualization geometry at about real size (about 11 m long
// over the bumper, 2.5 m wide, 30 m class ladder), millimetres, Z up, cab
// toward +X, tyres on z = 0.
meta({
  name: "aerial-ladder-fire-engine",
  license: 'CC0-1.0',
  title: "Aerial ladder fire engine",
  description: "Rear-mount aerial ladder truck: turntable carrying a two-section truss ladder raised and extended over a flat-face crew cab with raised roof, sloped windshield, light bar and chrome bumper; body with roll-up locker doors and reflective stripe on tandem rear duals; four outrigger jacks out on ground pads and a waterway nozzle at the tip. Material controls: ladder and metalwork, tire rubber and glass, cab roof stripe and locker finish, apparatus body paint; weathered, highVisibility and whiteCab presets.",
  tags: ['aerial ladder', 'ladder truck', 'fire engine', 'fire truck', 'fire rescue', 'fire service', 'emergency scene', 'vehicle', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 6000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const metalworkColor = param('metalworkColor', '#b4bdc1', { label: 'Ladder and metalwork' });
const tireRubberColor = param('tireRubberColor', '#24292d', { label: 'Tire rubber and glass' });
const cabPaintColor = param('cabPaintColor', '#eee7d7', { label: 'Cab roof, stripe and locker finish' });
const bodyPaintColor = param('bodyPaintColor', '#c4302a', { label: 'Apparatus body paint' });
presets({
  weathered: { metalworkColor: '#879294', tireRubberColor: '#3a3b39', cabPaintColor: '#cfc4ae', bodyPaintColor: '#89534b' },
  highVisibility: { metalworkColor: '#c5c7ab', tireRubberColor: '#272c30', cabPaintColor: '#f4e7b1', bodyPaintColor: '#e77f23' },
  whiteCab: { metalworkColor: '#c9cfd2', tireRubberColor: '#202428', cabPaintColor: '#b8202a', bodyPaintColor: '#f1efe8' },
});

const p = assembly("aerial-ladder-fire-engine");
// Parts are collected, then lifted so the lowest point rests on z = 0.
const parts = [];
const add = (name, shape, finish) => parts.push([name, shape.color(finish)]);

const circle = (r, n, cx = 0, cy = 0) =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);
// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Side profile [[x, z], ...] extruded t wide across Y, centred on y = yc.
const sideXZ = (pts, t, yc = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, yc + t / 2, 0);
// Front profile [[y, z], ...] extruded t long along +X from x0.
const frontYZ = (pts, t, x0) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0, 0, 0);
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

const HALF = 1250; // half body width
const TYRE_R = 540;
const FRONT_AXLE = 3500;
const REAR_AXLES = [-2500, -3900];

// Wheels: turned tyre ring round a steel rim, lying across Y.
const tyre = (w) => turned([[300, -w / 2], [TYRE_R - 50, -w / 2], [TYRE_R, -w / 2 + 50], [TYRE_R, w / 2 - 50], [TYRE_R - 50, w / 2], [300, w / 2]]);
const rim = (w) => turned([[0, -w / 2 + 20], [300, -w / 2 + 20], [300, w / 2 - 20], [120, w / 2 - 5], [0, w / 2 - 5]]);
const wheel = (name, x, y, w, flip) => {
  const r = flip ? 180 : 0;
  add(`${name}-tyre`, tyre(w).rotateX(90 + r).translate(x, y, TYRE_R), tireRubberColor);
  add(`${name}-rim`, rim(w).rotateX(90 + r).translate(x, y, TYRE_R), metalworkColor);
};
for (const s of [-1, 1]) {
  wheel(`front-wheel-${s}`, FRONT_AXLE, s * 1050, 320, s < 0);
  for (const x of REAR_AXLES) wheel(`rear-wheel-${x}-${s}`, x, s * 950, 560, s < 0);
}

// Ladder frame rails under everything.
for (const s of [-1, 1]) add(`frame-rail-${s}`, sideXZ(rect(-5300, 700, 5100, 980), 120, s * 420), metalworkColor);

// Custom crew cab: flat face, sloped windshield, raised crew roof.
const CAB_REAR = 2650;
const cabSide = [[CAB_REAR, 980], [5150, 980], [5230, 1100], [5230, 1850], [5160, 1950], [4960, 2730], [4880, 2790], [4300, 2790], [4220, 3020], [CAB_REAR, 3020]];
const archCut = (x, r) => cylinder(2 * HALF + 200, r, 20).rotateX(90).translate(x, HALF + 100, TYRE_R);
add('crew-cab', sideXZ(cabSide, 2 * HALF).subtract(archCut(FRONT_AXLE, 640)), bodyPaintColor);
add('cab-roof-cap', sideXZ([[CAB_REAR - 10, 2790], [4300, 2790], [4220, 3030], [CAB_REAR - 10, 3030]], 2 * HALF + 20), cabPaintColor);
add('cab-front-roof', sideXZ([[4300, 2795], [4880, 2795], [4960, 2735], [4975, 2760], [4890, 2820], [4300, 2820]], 2 * HALF + 20), cabPaintColor);
add('windshield', sideXZ([[5168, 1955], [4968, 2735], [4995, 2740], [5195, 1960]], 2 * HALF - 160), tireRubberColor);
for (const s of [-1, 1]) {
  const y = s * (HALF + 6);
  add(`door-window-${s}`, sideXZ([[4320, 1960], [4980, 1960], [4810, 2640], [4320, 2640]], 14, y), tireRubberColor);
  add(`crew-window-a-${s}`, sideXZ(rect(3620, 2000, 4150, 2850), 14, y), tireRubberColor);
  add(`crew-window-b-${s}`, sideXZ(rect(2850, 2000, 3480, 2850), 14, y), tireRubberColor);
  add(`cab-step-${s}`, sideXZ(rect(4300, 820, 4950, 880), 260, s * (HALF - 60)), metalworkColor);
  add(`cab-handrail-${s}`, rod([4230, s * (HALF + 40), 1150], [4230, s * (HALF + 40), 2400], 22), metalworkColor);
  add(`mirror-arm-${s}`, rod([5050, s * HALF, 2300], [5250, s * (HALF + 280), 2350], 20), metalworkColor);
  add(`mirror-${s}`, sideXZ(rect(5180, 2050, 5280, 2550), 160, s * (HALF + 300)), metalworkColor);
  add(`headlamp-${s}`, turned([[0, 0], [110, 0], [110, 30], [0, 30]]).rotateY(90).translate(5230, s * 900, 1500), cabPaintColor);
}
add('grille', frontYZ([[-620, 1250], [620, 1250], [620, 1800], [-620, 1800]], 20, 5230), metalworkColor);
add('front-bumper', frontYZ([[-HALF - 40, 820], [HALF + 40, 820], [HALF + 40, 1180], [-HALF - 40, 1180]], 360, 5150)
  .subtract(frontYZ([[-HALF - 60, 1080], [HALF + 60, 1080], [HALF + 60, 1200], [-HALF - 60, 1200]], 120, 5400)), metalworkColor);
add('light-bar', sideXZ(rect(4400, 2820, 4700, 2930), 2000), bodyPaintColor);
add('light-bar-base', sideXZ(rect(4380, 2800, 4720, 2830), 2100), metalworkColor);

// Body: wheel arches cut, roll-up locker doors, reflective stripe.
const BODY_TOP = 2450;
const body = sideXZ(rect(-5300, 980, CAB_REAR - 40, BODY_TOP), 2 * HALF)
  .subtract(sideXZ([[-4700, 0], [-1700, 0], [-1700, 1050], [-1950, 1250], [-4450, 1250], [-4700, 1050]], 2 * HALF + 200));
add('apparatus-body', body, bodyPaintColor);
for (const s of [-1, 1]) {
  const y = s * (HALF + 8);
  const doors = [[-1550, -400], [-300, 900], [1000, 2500], [-5200, -4800]];
  doors.forEach(([x0, x1], i) => {
    add(`locker-door-${i}-${s}`, sideXZ(rect(x0, i === 3 ? 1300 : 1080, x1, BODY_TOP - 90), 16, y), cabPaintColor);
    add(`locker-handle-${i}-${s}`, sideXZ(rect(x0 + 60, i === 3 ? 1340 : 1120, x1 - 60, i === 3 ? 1380 : 1160), 30, s * (HALF + 24)), metalworkColor);
  });
  add(`reflective-stripe-${s}`, sideXZ(rect(-5300, 1000, 5230, 1060), 12, s * (HALF + 18)), cabPaintColor);
  add(`body-rub-rail-${s}`, sideXZ(rect(-5300, BODY_TOP - 60, CAB_REAR - 40, BODY_TOP), 40, s * (HALF + 20)), metalworkColor);
}
add('rear-step', sideXZ(rect(-5520, 860, -5300, 920), 2 * HALF - 200), metalworkColor);
for (const s of [-1, 1]) add(`tail-light-${s}`, sideXZ(rect(-5320, 1500, -5300, 1700), 220, s * 1050), bodyPaintColor);

// Outriggers: beams out to the sides, jacks down to round ground pads.
for (const x of [CAB_REAR - 250, -5000]) {
  for (const s of [-1, 1]) {
    add(`outrigger-beam-${x}-${s}`, sideXZ(rect(x - 140, 900, x + 140, 1150), 900, s * (HALF + 400)), metalworkColor);
    add(`outrigger-jack-${x}-${s}`, turned([[0, 0], [90, 0], [90, 1050], [0, 1050]]).translate(x, s * (HALF + 780), 70), cabPaintColor);
    add(`outrigger-pad-${x}-${s}`, turned([[0, 0], [300, 0], [300, 40], [120, 70], [0, 70]]).translate(x, s * (HALF + 780), 0), metalworkColor);
  }
}

// Turntable at the rear of the body with the ladder pedestal.
const TT = [-4300, 0];
add('turntable', turned([[0, 0], [1050, 0], [1050, 160], [980, 220], [0, 220]]).translate(TT[0], TT[1], BODY_TOP), metalworkColor);
const PIVOT = [TT[0] + 250, BODY_TOP + 1000];
for (const s of [-1, 1]) {
  add(`pedestal-${s}`, sideXZ([[TT[0] - 700, BODY_TOP + 220], [TT[0] + 650, BODY_TOP + 220], [PIVOT[0] + 200, PIVOT[1] - 120], [PIVOT[0] + 120, PIVOT[1] + 150], [PIVOT[0] - 260, PIVOT[1] + 150], [TT[0] - 700, BODY_TOP + 600]], 90, s * 760), bodyPaintColor);
}
add('pivot-pin', rod([PIVOT[0], -900, PIVOT[1]], [PIVOT[0], 900, PIVOT[1]], 70, 10), metalworkColor);
add('operator-console', sideXZ(rect(TT[0] - 950, BODY_TOP + 220, TT[0] - 700, BODY_TOP + 1250), 400, -650), bodyPaintColor);

// Two-section truss ladder, built along +X from the pivot, then raised.
const ANGLE = 15;
const BASE_LEN = 9200;
const FLY_START = 1800;
const FLY_LEN = 8600;
const lad = [];
const lpart = (name, shape, finish) => lad.push([name, shape, finish]);
const truss = (tag, x0, x1, w, h, z0, rungStep, rungFrom) => {
  for (const s of [-1, 1]) {
    const y = s * w;
    lpart(`${tag}-chord-${s}`, rod([x0, y, z0], [x1, y, z0], 60), metalworkColor);
    lpart(`${tag}-handrail-${s}`, rod([x0 + 200, y, z0 + h], [x1 - 100, y, z0 + h], 40), metalworkColor);
    const bays = Math.round((x1 - x0) / 1100);
    for (let i = 0; i <= bays; i++) {
      const x = x0 + 200 + ((x1 - x0 - 300) * i) / bays;
      lpart(`${tag}-post-${i}-${s}`, rod([x, y, z0], [x, y, z0 + h], 20, 4), metalworkColor);
      if (i < bays) {
        const xn = x0 + 200 + ((x1 - x0 - 300) * (i + 1)) / bays;
        lpart(`${tag}-brace-${i}-${s}`, rod([x, y, z0 + h], [xn, y, z0], 16, 4), metalworkColor);
      }
    }
  }
  for (let x = rungFrom; x < x1 - 100; x += rungStep) {
    lpart(`${tag}-rung-${Math.round(x)}`, rod([x, -w, z0 + 10], [x, w, z0 + 10], 22, 4), metalworkColor);
  }
};
truss('base', 0, BASE_LEN, 640, 720, 0, 360, 300);
truss('fly', FLY_START, FLY_START + FLY_LEN, 520, 560, 110, 360, BASE_LEN + 80);
lpart('heel-plate', sideXZ(rect(-300, -120, 400, 160), 1400), bodyPaintColor);
// Waterway pipe under the ladder to a tip nozzle.
lpart('waterway', rod([200, 0, -80], [FLY_START + FLY_LEN - 300, 0, 30], 70, 8), metalworkColor);
lpart('tip-nozzle', turned([[0, 0], [110, 0], [80, 260], [45, 420], [0, 420]]).rotateY(90).translate(FLY_START + FLY_LEN - 300, 0, 30), cabPaintColor);
for (const [name, shape, finish] of lad) {
  add(`ladder-${name}`, shape.rotateY(-ANGLE).translate(PIVOT[0], 0, PIVOT[1]), finish);
}

// Twin elevating cylinders from the turntable to the base section.
const liftAt = 2400;
const lift = [PIVOT[0] + liftAt * Math.cos((ANGLE * Math.PI) / 180), PIVOT[1] + liftAt * Math.sin((ANGLE * Math.PI) / 180) - 60];
for (const s of [-1, 1]) {
  add(`lift-cylinder-${s}`, rod([TT[0] + 600, s * 420, BODY_TOP + 250], [(TT[0] + 600 + lift[0]) / 2, s * 420, (BODY_TOP + 250 + lift[1]) / 2], 110, 10), bodyPaintColor);
  add(`lift-ram-${s}`, rod([(TT[0] + 600 + lift[0]) / 2, s * 420, (BODY_TOP + 250 + lift[1]) / 2], [lift[0], s * 420, lift[1]], 65, 10), metalworkColor);
}

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
