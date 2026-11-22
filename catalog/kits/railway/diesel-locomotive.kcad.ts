// SPDX-License-Identifier: CC0-1.0
// Diesel locomotive: a four-axle road-switcher. What makes it one: a narrow
// long hood behind a tall full-width cab and a low short hood nose in front,
// all standing on a flat walkway deck ringed by yellow handrails, with
// radiator grilles and roof fans at the back, a dynamic-brake blister and
// exhaust stack on top, a big fuel tank slung between two bogies with coil
// springs, pilots with steps and couplers at each end, and headlights,
// number boards and ditch lights on the nose.
// Generic visualization geometry at about real size (about 18 m over
// couplers, 3.1 m wide, 4.7 m tall, 1.02 m wheels on standard gauge),
// millimetres, Z up, short hood toward +X, wheel flanges on z = 0
// (rail top 30 mm up).
meta({
  name: "diesel-locomotive",
  license: 'CC0-1.0',
  title: "Diesel locomotive",
  description: "Four-axle road-switcher diesel locomotive at about real size: long hood with radiator grilles, roof fans, dynamic-brake blister and exhaust stack, tall cab with windscreens, side windows, horn and bell, low short-hood nose with headlights, number boards and ditch lights, walkway deck with safety-yellow stanchions and rails, two bogies with side frames, coil springs and flanged wheels, fuel tank and air reservoirs, pilots with steps and couplers. Material controls: rail and running gear steel, livery paint, glazing, amber signal glass, safety-yellow handrails; weathered, freshService and heritageMaroon presets.",
  tags: ["diesel locomotive", "road switcher", "freight locomotive", "diesel-electric", "railway", "train", "rail-yard", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 8000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#3f4649', { label: 'Rail and running gear steel' });
const paintedSteel = param('paintedSteel', '#28758b', { label: 'Livery paint' });
const glass = param('glass', '#54a6bb', { label: 'Glazing' });
const signalAmberGlass = param('signalAmberGlass', '#efb438', { label: 'Amber signal glass' });
const safetyYellow = param('safetyYellow', '#e3c12c', { label: 'Safety-yellow handrails' });
presets({
  weathered: { railSteel: '#4d4f4c', paintedSteel: '#3b717e', glass: '#5a99a7', signalAmberGlass: '#d6a53f', safetyYellow: '#bba046' },
  freshService: { railSteel: '#353c40', paintedSteel: '#b74734', glass: '#68b9ca', signalAmberGlass: '#ffc12f', safetyYellow: '#f2cf2b' },
  heritageMaroon: { railSteel: '#2f3436', paintedSteel: '#6e2a2a', glass: '#5ea2b2', signalAmberGlass: '#f4ba3a', safetyYellow: '#e8d9a0' },
});

const p = assembly("diesel-locomotive");
// Lifted so the wheel flanges (30 mm below the rail top) rest on z = 0.
const flange = 30;
const add = (name, shape) => p.part(name, shape.translate(0, 0, flange).scale(scale));

// Side outline [[x, z], ...] extruded across Y, centred on y0.
const side = (pts, t, y0 = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2 + y0, 0);
// Front outline [[y, z], ...] extruded along X, centred on x0.
const front = (pts, t, x0 = 0) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0 - t / 2, 0, 0);
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

// Flanged disc wheel on an axle along Y, tread on the rail at y = s * 750.
const toSide = (shape, x, s, r) => (s > 0 ? shape.rotateX(90) : shape.rotateX(-90)).translate(x, s * 790, r);
const wheel = (name, x, s, r) => {
  add(`${name}-tyre`, toSide(turned([[r - 80, 0], [r, 0], [r, 110], [r + 30, 118], [r + 30, 140], [r - 80, 140]]), x, s, r).color(railSteel));
  add(`${name}-disc`, toSide(turned([[0, -40], [r * 0.24, -40], [r * 0.24, 20], [r - 80, 60], [r - 80, 90], [0, 90]]), x, s, r).color(railSteel));
};

// ---- Running gear: two bogies with side frames, springs and journal boxes ----
const wheelR = 510;
for (const xc of [-5000, 5000]) {
  for (const s of [-1, 1]) {
    const tag = `${xc > 0 ? 'front' : 'rear'}-${s > 0 ? 'left' : 'right'}`;
    for (const dx of [-1300, 1300]) {
      wheel(`wheel-${tag}-${dx}`, xc + dx, s, wheelR);
      add(`journal-box-${tag}-${dx}`, side([[xc + dx - 200, 330], [xc + dx + 200, 330], [xc + dx + 200, 720], [xc + dx - 200, 720]], 220, s * 960).color(railSteel));
    }
    add(`side-frame-${tag}`, side([[xc - 1850, 600], [xc - 1500, 450], [xc - 900, 450], [xc - 500, 650], [xc + 500, 650], [xc + 900, 450], [xc + 1500, 450], [xc + 1850, 600], [xc + 1850, 900], [xc - 1850, 900]], 160, s * 980).color(railSteel));
    for (const dy of [-1, 1]) add(`spring-${tag}-${dy}`, turned([[0, 0], [110, 0], [110, 300], [0, 300]]).translate(xc + dy * 200, s * 980, 900).color(safetyYellow));
    add(`brake-cylinder-${tag}`, alongX([[0, 0], [120, 0], [120, 260], [0, 260]], xc - 130, s * 1150, 750).color(railSteel));
  }
  add(`bolster-${xc}`, side([[xc - 300, 950], [xc + 300, 950], [xc + 300, 1200], [xc - 300, 1200]], 2200).color(railSteel));
}

// ---- Underframe, fuel tank, reservoirs, deck ----
add('underframe', side([[-8900, 1150], [8900, 1150], [8900, 1520], [-8900, 1520]], 2900).color(railSteel));
add('fuel-tank', front(filletPolygon([[-1350, 500], [1350, 500], [1450, 750], [1450, 1200], [-1450, 1200], [-1450, 750]], 80), 5400, 0).color(railSteel));
for (const s of [-1, 1]) add(`air-reservoir-${s}`, alongX([[0, 0], [190, 0], [190, 2600], [0, 2600]], -1300, s * 1320, 1350).color(railSteel));
add('walkway', side([[-9000, 1520], [9000, 1520], [9000, 1600], [-9000, 1600]], 3150).color(railSteel));
for (const s of [-1, 1]) add(`deck-edge-${s}`, side([[-9000, 1400], [9000, 1400], [9000, 1600], [-9000, 1600]], 40, s * 1560).color(paintedSteel));

// ---- Long hood with grilles, fans, blister and stack ----
const hoodSection = [[-1100, 1600], [1100, 1600], [1100, 3750], [950, 3900], [-950, 3900], [-1100, 3750]];
add('long-hood', front(hoodSection, 11300, -3050).color(paintedSteel));
for (const s of [-1, 1]) {
  add(`radiator-grille-${s}`, side([[-8400, 2700], [-6500, 2700], [-6500, 3700], [-8400, 3700]], 30, s * 1110).color(railSteel));
  for (let i = 0; i < 6; i++) {
    const x = -5800 + i * 1350;
    add(`hood-door-${s}-${i}`, side([[x, 1750], [x + 1150, 1750], [x + 1150, 3500], [x, 3500]], 16, s * 1104).color(paintedSteel));
    add(`door-latch-${s}-${i}`, side([[x + 1000, 2550], [x + 1080, 2550], [x + 1080, 2700], [x + 1000, 2700]], 30, s * 1115).color(railSteel));
  }
  add(`intake-louvre-${s}`, side([[-2600, 2900], [-1500, 2900], [-1500, 3500], [-2600, 3500]], 30, s * 1110).color(railSteel));
}
for (const x of [-8000, -7000]) {
  add(`fan-housing-${x}`, turned([[0, 0], [470, 0], [470, 120], [0, 120]]).translate(x, 0, 3880).color(railSteel));
  add(`fan-hub-${x}`, turned([[0, 0], [120, 0], [120, 170], [0, 170]]).translate(x, 0, 3880).color(paintedSteel));
}
add('dynamic-brake-blister', front([[-1050, 3850], [1050, 3850], [900, 4200], [-900, 4200]], 1900, -4200).color(paintedSteel));
for (const s of [-1, 1]) add(`blister-grille-${s}`, side([[-5000, 3920], [-3400, 3920], [-3400, 4120], [-5000, 4120]], 20, s * 1000).color(railSteel));
add('exhaust-stack', side([[-2200, 3850], [-1700, 3850], [-1750, 4220], [-2150, 4220]], 300).color(railSteel));
add('rear-headlight-box', side([[-8700, 3500], [-8550, 3500], [-8550, 3880], [-8700, 3880]], 500).color(paintedSteel));
add('rear-headlight', alongX([[0, 0], [110, 0], [110, 20], [0, 20]], -8720, 0, 3690).color(signalAmberGlass));

// ---- Cab: full width, windscreens, side windows, horn and bell ----
add('cab', side([[2600, 1600], [5200, 1600], [5200, 4300], [2600, 4300]], 3100).color(paintedSteel));
add('cab-roof', front([[-1600, 4280], [1600, 4280], [1450, 4520], [900, 4640], [-900, 4640], [-1450, 4520]], 2700, 3900).color(paintedSteel));
add('roof-drip', front([[-1620, 4260], [1620, 4260], [1620, 4300], [-1620, 4300]], 2760, 3900).color(railSteel));
for (const s of [-1, 1]) {
  add(`windscreen-${s}`, side([[5195, 3380], [5225, 3380], [5225, 4150], [5195, 4150]], 1150, s * 760).color(glass));
  add(`rear-window-${s}`, side([[2575, 3450], [2605, 3450], [2605, 4100], [2575, 4100]], 600, s * 1050).color(glass));
  add(`side-window-${s}-0`, side([[3900, 3150], [5000, 3150], [5000, 4100], [3900, 4100]], 20, s * 1555).color(glass));
  add(`side-window-${s}-1`, side([[2800, 3150], [3750, 3150], [3750, 4100], [2800, 4100]], 20, s * 1555).color(glass));
  add(`window-mullion-${s}`, side([[3750, 3100], [3900, 3100], [3900, 4150], [3750, 4150]], 30, s * 1560).color(railSteel));
  add(`cab-sill-${s}`, side([[2700, 3050], [5100, 3050], [5100, 3120], [2700, 3120]], 40, s * 1565).color(safetyYellow));
}
add('sun-visor', side([[5200, 4170], [5450, 4140], [5450, 4190], [5200, 4230]], 2600).color(railSteel));
add('horn', alongX([[0, 0], [45, 0], [45, 220], [110, 300], [0, 300]], 4400, 300, 4650).color(railSteel));
add('horn-2', alongX([[0, 0], [45, 0], [45, 300], [120, 380], [0, 380]], 4300, -300, 4650).color(railSteel));
add('bell', turned([[0, 0], [190, 0], [150, 120], [110, 230], [0, 250]]).translate(3200, 0, 4630).color(safetyYellow));

// ---- Short hood nose: number boards, headlights, ditch lights ----
add('short-hood', side([[5200, 1600], [8200, 1600], [8200, 3050], [7700, 3450], [5200, 3450]], 2100).color(paintedSteel));
add('headlight-box', front([[-300, 2650], [300, 2650], [300, 2950], [-300, 2950]], 160, 8270).color(railSteel));
for (const dy of [-130, 130]) add(`headlight-${dy}`, alongX([[0, 0], [90, 0], [90, 30], [0, 30]], 8340, dy, 2800).color(signalAmberGlass));
for (const s of [-1, 1]) {
  add(`number-board-${s}`, front([[s * 520 - 260, 2300], [s * 520 + 260, 2300], [s * 520 + 260, 2500], [s * 520 - 260, 2500]], 40, 8215).color(glass));
  add(`class-light-${s}`, alongX([[0, 0], [70, 0], [70, 40], [0, 40]], 8200, s * 900, 3000).color(signalAmberGlass));
  add(`ditch-light-${s}`, alongX([[0, 0], [100, 0], [100, 120], [0, 120]], 8900, s * 1150, 1750).color(signalAmberGlass));
}

// ---- Ends: pilots, steps, couplers, end rails ----
for (const e of [-1, 1]) {
  const x0 = e * 8900;
  const tag = e > 0 ? 'front' : 'rear';
  add(`pilot-${tag}`, side(e > 0
    ? [[x0, 350], [x0 + 300, 350], [x0 + 300, 1600], [x0, 1600]]
    : [[x0 - 300, 350], [x0, 350], [x0, 1600], [x0 - 300, 1600]], 3100).color(paintedSteel));
  add(`pilot-stripe-${tag}`, side(e > 0
    ? [[x0 + 300, 400], [x0 + 320, 400], [x0 + 320, 1000], [x0 + 300, 1000]]
    : [[x0 - 320, 400], [x0 - 300, 400], [x0 - 300, 1000], [x0 - 320, 1000]], 2600).color(safetyYellow));
  add(`coupler-${tag}`, side(e > 0
    ? [[x0 + 300, 750], [x0 + 800, 750], [x0 + 800, 1050], [x0 + 300, 1050]]
    : [[x0 - 800, 750], [x0 - 300, 750], [x0 - 300, 1050], [x0 - 800, 1050]], 260).color(railSteel));
  add(`coupler-knuckle-${tag}`, front([[-300, 650], [200, 650], [200, 1150], [-300, 1150]], 200, x0 + e * 850).color(railSteel));
  for (const s of [-1, 1]) {
    // Corner steps hung below the deck.
    const xs = x0 - e * 700;
    add(`step-hanger-${tag}-${s}`, side([[xs - 350, 350], [xs + 350, 350], [xs + 350, 1520], [xs - 350, 1520]], 40, s * 1530).color(safetyYellow));
    for (const z of [450, 850, 1250]) add(`step-tread-${tag}-${s}-${z}`, side([[xs - 330, z], [xs + 330, z], [xs + 330, z + 50], [xs - 330, z + 50]], 300, s * 1380).color(railSteel));
    add(`end-post-${tag}-${s}`, tube([x0 + e * 120, s * 1500, 1600], [x0 + e * 120, s * 1500, 2650], 30).color(safetyYellow));
  }
  add(`end-rail-${tag}`, tube([x0 + e * 120, -1500, 2600], [x0 + e * 120, 1500, 2600], 30).color(safetyYellow));
}

// ---- Walkway handrails: stanchions and top rail along both sides ----
for (const s of [-1, 1]) {
  const tag = s > 0 ? 'left' : 'right';
  add(`handrail-${tag}`, tube([-8780, s * 1500, 2600], [2500, s * 1500, 2600], 28).color(safetyYellow));
  add(`handrail-nose-${tag}`, tube([5300, s * 1500, 2600], [8780, s * 1500, 2600], 28).color(safetyYellow));
  for (const x of [-8780, -7000, -5200, -3400, -1600, 200, 2000, 2500, 5300, 7000, 8780]) {
    add(`stanchion-${tag}-${x}`, tube([x, s * 1500, 1600], [x, s * 1500, 2600], 24, 6).color(safetyYellow));
  }
}

return p.model();
