// SPDX-License-Identifier: CC0-1.0
// Quint fire apparatus: one truck carrying all five tools of the fire
// service - pump, water tank, hose, aerial ladder and ground ladders. What
// makes it a quint rather than a ladder truck is the pump house behind the
// cab, with a side pump panel of gauges and capped discharges and a deck gun
// on top, and the open hosebed of loaded hose at the rear, under a shorter
// aerial ladder that lies bedded forward on a rest over the cab. The
// outriggers are stowed against the body and a ground ladder rides on the
// side. Generic visualization geometry at about real size (about 10.7 m
// long, 2.5 m wide, 23 m class ladder), millimetres, Z up, cab toward +X,
// tyres on z = 0.
meta({
  name: "quint-fire-apparatus",
  license: 'CC0-1.0',
  title: "Quint fire apparatus",
  description: "Quint fire apparatus: flat-face crew cab with raised roof and light bar, pump house with side pump panel of gauges and capped discharges and a deck gun, open hosebed of loaded hose under a two-section truss aerial ladder bedded forward on a rest over the cab, rear turntable, stowed outriggers, side-racked ground ladder and roll-up lockers on tandem rear duals. Material controls: ladder and metalwork, tire rubber and glass, cab roof and locker finish, apparatus body paint, hose load; weathered, highVisibility and whiteCab presets.",
  tags: ['quint', 'fire apparatus', 'aerial ladder', 'pumper', 'fire truck', 'fire rescue', 'fire service', 'emergency scene', 'vehicle', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 7000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const metalworkColor = param('metalworkColor', '#b4bdc1', { label: 'Ladder and metalwork' });
const tireRubberColor = param('tireRubberColor', '#24292d', { label: 'Tire rubber and glass' });
const cabPaintColor = param('cabPaintColor', '#eee7d7', { label: 'Cab roof and locker finish' });
const bodyPaintColor = param('bodyPaintColor', '#c4302a', { label: 'Apparatus body paint' });
const hoseColor = param('hoseColor', '#d9b43a', { label: 'Hose load' });
presets({
  weathered: { metalworkColor: '#879294', tireRubberColor: '#3a3b39', cabPaintColor: '#cfc4ae', bodyPaintColor: '#89534b', hoseColor: '#a99353' },
  highVisibility: { metalworkColor: '#c5c7ab', tireRubberColor: '#272c30', cabPaintColor: '#f4e7b1', bodyPaintColor: '#e77f23', hoseColor: '#e6e2d6' },
  whiteCab: { metalworkColor: '#c9cfd2', tireRubberColor: '#202428', cabPaintColor: '#b8202a', bodyPaintColor: '#f1efe8', hoseColor: '#c43a2c' },
});

const p = assembly("quint-fire-apparatus");
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
const REAR_AXLES = [-2400, -3800];

// Wheels: turned tyre ring round a steel rim, lying across Y.
const tyre = (w) => turned([[300, -w / 2], [TYRE_R - 50, -w / 2], [TYRE_R, -w / 2 + 50], [TYRE_R, w / 2 - 50], [TYRE_R - 50, w / 2], [300, w / 2]]);
const rim = (w) => turned([[0, -w / 2 + 20], [300, -w / 2 + 20], [300, w / 2 - 20], [120, w / 2 - 5], [0, w / 2 - 5]]);
const wheel = (name, x, y, w, flip) => {
  const r = flip ? 180 : 0;
  // Round tyre held 2 mm up on a flat loaded contact patch, which sets the ground plane.
  add(`${name}-tyre`, tyre(w).rotateX(90 + r).translate(x, y, TYRE_R + 2), tireRubberColor);
  add(`${name}-rim`, rim(w).rotateX(90 + r).translate(x, y, TYRE_R + 2), metalworkColor);
  add(`${name}-contact-patch`, sideXZ(rect(x - 110, 0, x + 110, 14), w - 40, y), tireRubberColor);
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
  add(`headlamp-${s}`, cylinder(30, 110, 12).rotateY(90).translate(5230, s * 900, 1500), cabPaintColor);
}
add('grille', frontYZ([[-620, 1250], [620, 1250], [620, 1800], [-620, 1800]], 20, 5230), metalworkColor);
add('front-bumper', frontYZ([[-HALF - 40, 820], [HALF + 40, 820], [HALF + 40, 1180], [-HALF - 40, 1180]], 360, 5150)
  .subtract(frontYZ([[-HALF - 60, 1080], [HALF + 60, 1080], [HALF + 60, 1200], [-HALF - 60, 1200]], 120, 5400)), metalworkColor);
add('light-bar', sideXZ(rect(4400, 2820, 4700, 2930), 2000), bodyPaintColor);
add('light-bar-base', sideXZ(rect(4380, 2800, 4720, 2830), 2100), metalworkColor);

// Rear body with wheel arch, roll-up locker doors and reflective stripe.
const BODY_TOP = 2450;
const PUMP_X = 1700; // front of the body / rear of the pump house
add('apparatus-body', sideXZ(rect(-5300, 980, PUMP_X, BODY_TOP), 2 * HALF)
  .subtract(sideXZ([[-4600, 0], [-1600, 0], [-1600, 1050], [-1850, 1250], [-4350, 1250], [-4600, 1050]], 2 * HALF + 200)), bodyPaintColor);
for (const s of [-1, 1]) {
  const y = s * (HALF + 8);
  const doors = [[-1450, -150], [-50, 1600], [-5200, -4700]];
  doors.forEach(([x0, x1], i) => {
    const z0 = i === 2 ? 1300 : 1080;
    add(`locker-door-${i}-${s}`, sideXZ(rect(x0, z0, x1, BODY_TOP - 90), 16, y), cabPaintColor);
    add(`locker-handle-${i}-${s}`, sideXZ(rect(x0 + 60, z0 + 40, x1 - 60, z0 + 80), 30, s * (HALF + 24)), metalworkColor);
  });
  add(`reflective-stripe-${s}`, sideXZ(rect(-5300, 1000, 5230, 1060), 12, s * (HALF + 18)), cabPaintColor);
  add(`body-rub-rail-${s}`, sideXZ(rect(-5300, BODY_TOP - 60, PUMP_X, BODY_TOP), 40, s * (HALF + 20)), metalworkColor);
}
add('rear-step', sideXZ(rect(-5520, 860, -5300, 920), 2 * HALF - 200), metalworkColor);
for (const s of [-1, 1]) add(`tail-light-${s}`, sideXZ(rect(-5320, 1500, -5300, 1700), 220, s * 1050), bodyPaintColor);

// Pump house between cab and body: taller block, pump panel each side.
const PUMP_TOP = 2950;
add('pump-house', sideXZ(rect(PUMP_X, 980, CAB_REAR - 20, PUMP_TOP), 2 * HALF), bodyPaintColor);
const PX = (PUMP_X + CAB_REAR) / 2;
for (const s of [-1, 1]) {
  const y = s * (HALF + 10);
  add(`pump-panel-${s}`, sideXZ(rect(PUMP_X + 60, 1150, CAB_REAR - 80, PUMP_TOP - 120), 20, y), metalworkColor);
  // Master intake and discharge gauges.
  for (const [dx, z, r] of [[-200, 2500, 130], [200, 2500, 130], [-300, 2150, 70], [-100, 2150, 70], [100, 2150, 70], [300, 2150, 70]]) {
    add(`gauge-${dx}-${z}-${s}`, cylinder(30, r, 12).rotateX(-90 * s).translate(PX + dx, y + s * 10, z), cabPaintColor);
  }
  // Large intake low on the panel, three capped discharges above it.
  add(`intake-${s}`, turned([[0, 0], [190, 0], [190, 40], [150, 60], [150, 260], [210, 260], [210, 330], [0, 330]]).rotateX(-90 * s).translate(PX, y, 1500), metalworkColor);
  for (const dx of [-300, 0, 300]) {
    add(`discharge-${dx}-${s}`, turned([[0, 0], [60, 0], [60, 160], [85, 160], [85, 220], [0, 220]]).rotateX(-90 * s).translate(PX + dx, y, 1880), metalworkColor);
    add(`discharge-cap-${dx}-${s}`, cylinder(50, 90, 12).rotateX(-90 * s).translate(PX + dx, y + s * 220, 1880), cabPaintColor);
  }
}
// Deck gun on the pump house roof.
add('deck-gun-riser', turned([[0, 0], [150, 0], [150, 60], [90, 80], [90, 420], [0, 420]]).translate(PX, 0, PUMP_TOP), metalworkColor);
add('deck-gun-elbow', sphere(110).translate(PX, 0, PUMP_TOP + 470), metalworkColor);
add('deck-gun-barrel', rod([PX, 0, PUMP_TOP + 470], [PX + 650, 0, PUMP_TOP + 820], 80, 10), metalworkColor);
add('deck-gun-tip', turned([[0, 0], [110, 0], [70, 320], [0, 320]]).rotateY(62).translate(PX + 650, 0, PUMP_TOP + 820), cabPaintColor);

// Open hosebed: walls up past the body top, loaded hose flaked in three columns.
const HB = [-3900, PUMP_X - 60];
for (const s of [-1, 1]) {
  add(`hosebed-wall-${s}`, sideXZ([[HB[0], BODY_TOP], [HB[1], BODY_TOP], [HB[1], BODY_TOP + 450], [HB[0] + 150, BODY_TOP + 450], [HB[0], BODY_TOP + 300]], 60, s * (HALF - 30)), bodyPaintColor);
}
const flakes = (x0, x1, z0, n, pitch) => {
  // Side profile of n layers of flat hose with a fold bump at alternating ends.
  const pts = [[x0, z0], [x1, z0]];
  for (let i = 0; i < n; i++) {
    const zc = z0 + pitch * (i + 0.5);
    const right = i % 2 === 0;
    const x = right ? x1 : x0;
    for (let k = 0; k <= 4; k++) {
      const a = (-90 + (180 * k) / 4) * (Math.PI / 180);
      if (right) pts.push([x + (pitch / 2) * Math.cos(a), zc + (pitch / 2) * Math.sin(a)]);
    }
  }
  pts.push([x1, z0 + pitch * n], [x0, z0 + pitch * n]);
  for (let i = n - 1; i >= 0; i--) {
    if (i % 2 === 0) continue;
    const zc = z0 + pitch * (i + 0.5);
    for (let k = 0; k <= 4; k++) {
      const a = (90 + (180 * k) / 4) * (Math.PI / 180);
      pts.push([x0 + (pitch / 2) * Math.cos(a), zc + (pitch / 2) * Math.sin(a)]);
    }
  }
  return pts.filter((q, i) => {
    const r = pts[(i + pts.length - 1) % pts.length];
    return Math.hypot(q[0] - r[0], q[1] - r[1]) > 1e-6;
  });
};
for (const [i, y] of [-760, 0, 760].entries()) {
  add(`hose-load-${i}`, sideXZ(flakes(HB[0] + 150 + i * 90, HB[1] - 200 - i * 60, BODY_TOP, 5, 80), 640, y), hoseColor);
}
for (const y of [-380, 380]) add(`hosebed-divider-${y}`, sideXZ(rect(HB[0] + 100, BODY_TOP, HB[1], BODY_TOP + 380), 30, y), metalworkColor);

// Ground ladder racked along the right hosebed wall.
{
  const y = HALF + 70;
  for (const z of [BODY_TOP + 90, BODY_TOP + 400]) add(`ground-ladder-rail-${z}`, rod([HB[0] + 100, y, z], [HB[1] - 200, y, z], 30), metalworkColor);
  for (let x = HB[0] + 250; x < HB[1] - 250; x += 330) add(`ground-ladder-rung-${x}`, rod([x, y, BODY_TOP + 90], [x, y, BODY_TOP + 400], 16, 4), metalworkColor);
}

// Stowed outriggers: jack housings against the body, pads drawn up.
for (const x of [PUMP_X - 200, -5000]) {
  for (const s of [-1, 1]) {
    add(`outrigger-housing-${x}-${s}`, sideXZ(rect(x - 150, 820, x + 150, 1180), 160, s * (HALF + 80)), metalworkColor);
    add(`outrigger-jack-${x}-${s}`, turned([[0, 0], [80, 0], [80, 420], [0, 420]]).translate(x, s * (HALF + 80), 420), cabPaintColor);
    add(`outrigger-pad-${x}-${s}`, turned([[0, 0], [230, 0], [230, 40], [100, 60], [0, 60]]).translate(x, s * (HALF + 80), 360), metalworkColor);
  }
}

// Turntable at the rear with the ladder pedestal.
const TT = [-4400, 0];
add('turntable', turned([[0, 0], [1000, 0], [1000, 160], [930, 220], [0, 220]]).translate(TT[0], TT[1], BODY_TOP), metalworkColor);
const PIVOT = [TT[0] + 250, BODY_TOP + 900];
for (const s of [-1, 1]) {
  add(`pedestal-${s}`, sideXZ([[TT[0] - 650, BODY_TOP + 220], [TT[0] + 620, BODY_TOP + 220], [PIVOT[0] + 200, PIVOT[1] - 120], [PIVOT[0] + 120, PIVOT[1] + 150], [PIVOT[0] - 260, PIVOT[1] + 150], [TT[0] - 650, BODY_TOP + 600]], 90, s * 760), bodyPaintColor);
}
add('pivot-pin', rod([PIVOT[0], -900, PIVOT[1]], [PIVOT[0], 900, PIVOT[1]], 70, 10), metalworkColor);
add('operator-console', sideXZ(rect(TT[0] - 900, BODY_TOP + 220, TT[0] - 650, BODY_TOP + 1150), 400, -650), bodyPaintColor);

// Two-section truss ladder bedded forward, fly retracted inside the base.
const ANGLE = -1.5;
const BASE_LEN = 9000;
const lad = [];
const lpart = (name, shape, finish) => lad.push([name, shape, finish]);
const truss = (tag, x0, x1, w, h, z0, rungStep, braced = true) => {
  for (const s of [-1, 1]) {
    const y = s * w;
    lpart(`${tag}-chord-${s}`, rod([x0, y, z0], [x1, y, z0], 60), metalworkColor);
    lpart(`${tag}-handrail-${s}`, rod([x0 + 200, y, z0 + h], [x1 - 100, y, z0 + h], 40), metalworkColor);
    const bays = braced ? Math.round((x1 - x0) / 1100) : -1;
    for (let i = 0; i <= bays; i++) {
      const x = x0 + 200 + ((x1 - x0 - 300) * i) / bays;
      lpart(`${tag}-post-${i}-${s}`, rod([x, y, z0], [x, y, z0 + h], 20, 4), metalworkColor);
      if (i < bays) {
        const xn = x0 + 200 + ((x1 - x0 - 300) * (i + 1)) / bays;
        lpart(`${tag}-brace-${i}-${s}`, rod([x, y, z0 + h], [xn, y, z0], 16, 4), metalworkColor);
      }
    }
  }
  if (rungStep) for (let x = 300; x < x1 - 100; x += rungStep) lpart(`${tag}-rung-${Math.round(x)}`, rod([x, -w, z0 + 10], [x, w, z0 + 10], 22, 4), metalworkColor);
};
truss('base', 0, BASE_LEN, 640, 640, 0, 360);
// The retracted fly shows only its chords and handrails inside the base.
truss('fly', 500, BASE_LEN - 300, 520, 500, 110, 0, false);
lpart('heel-plate', sideXZ(rect(-300, -120, 400, 160), 1400), bodyPaintColor);
lpart('tip-nozzle', turned([[0, 0], [110, 0], [80, 260], [45, 420], [0, 420]]).rotateY(90).translate(BASE_LEN - 300, 0, 30), cabPaintColor);
for (const [name, shape, finish] of lad) {
  add(`ladder-${name}`, shape.rotateY(-ANGLE).translate(PIVOT[0], 0, PIVOT[1]), finish);
}
// Ladder rest on the cab roof under the base section.
const restX = 3700;
const restZ = PIVOT[1] + (restX - PIVOT[0]) * Math.tan((ANGLE * Math.PI) / 180) - 60;
for (const s of [-1, 1]) add(`ladder-rest-post-${s}`, rod([restX, s * 640, 3030], [restX, s * 640, restZ], 45), metalworkColor);
add('ladder-rest-bar', sideXZ(rect(restX - 60, restZ - 60, restX + 60, restZ), 1450), metalworkColor);

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
