// SPDX-License-Identifier: CC0-1.0
// Ore sorting sensor arch, a sensor-based ore sorter that looks at every
// rock on a fast belt and blows the waste rocks out of the stream with air
// jets. What makes one: a vibrating feeder spreads the ore into a single
// layer on a flat 1200 mm belt, the belt carries it under a sensor arch
// (an X-ray source over the belt with a detector line under it, inside a
// shielding tunnel with lead curtains, or a camera bar with LED light
// lines), and at the end of the belt the rocks fly off in an arc past a
// row of air-jet nozzles. Rocks the sensor rejects are blown down into
// the near chute; the rest clear a splitter plate into the far chute.
// Below, two cross belts carry product and waste away. Around it: the
// enclosed discharge housing, a control cabinet with HMI and stack light.
// The sensor choice switches between X-ray transmission and optical; the
// housing choice opens the front panel so the eject is visible.
// Millimetres, Z up, belt running along +X.
meta({
  name: "ore-sorting-arch",
  license: 'CC0-1.0',
  title: "Ore sorting sensor arch",
  description: "Sensor-based ore sorter at about real size: vibrating feeder with feed hopper, unbalanced motors and spring mounts; 4.2 m flat 1200 mm belt in an enclosed side frame; sensor arch over the belt (X-ray source, detector line and shielding tunnel with lead curtains, or optical camera bar with LED light lines); air-jet ejector manifold with nozzle row; rocks on the belt and in flight, rejected rocks blown into the near chute; splitter plate; lofted product and waste chutes onto two cross belts; discharge housing; control cabinet with HMI and stack light. Sensor choice (xrt, optical) and housing choice (open, closed). Material controls: housing paint, frame steel, accent paint and ore. weathered, copperOre and darkPanel presets.",
  tags: ['mining', 'ore sorting', 'sensor-based sorting', 'x-ray', 'conveyor', 'mineral processing', 'materials handling'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 3400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const sensor = param('sensor', 'xrt', { choices: ['xrt', 'optical'], label: 'Sensor type' });
const housing = param('housing', 'open', { choices: ['open', 'closed'], label: 'Discharge housing front' });
const housingPaint = param('housingPaint', '#e4e6e3', { label: 'Housing paint' });
const frameSteel = param('frameSteel', '#4e5961', { label: 'Frame steel' });
const accent = param('accent', '#1f6fb2', { label: 'Accent paint' });
const ore = param('ore', '#7c6a55', { label: 'Ore' });
presets({
  weathered: { housingPaint: '#b9b7ae', frameSteel: '#5f5b55', accent: '#4f6377', ore: '#8a7462' },
  copperOre: { housingPaint: '#e4e6e3', frameSteel: '#3f4a52', accent: '#2f6f4a', ore: '#5f7a5c' },
  darkPanel: { housingPaint: '#3a4046', frameSteel: '#2a3034', accent: '#e2661c', ore: '#9c7a5a' },
});

const p = assembly("ore-sorting-arch");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Lathe along Y: [[radius, y], ...] with y rising, centred on (x, z).
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);
// Closed (x, z) outline extruded across Y from y0 to y1.
const prismY = (pts, y0, y1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [a, b] of pts.slice(1)) o = o.lineTo(a, b);
  return o.close().extrude(y1 - y0).rotateX(90).translate(0, y1, 0);
};
const rect = (x0, x1, y0, y1) => path().moveTo(x0, y0).lineTo(x1, y0).lineTo(x1, y1).lineTo(x0, y1).close();
const taper = (lo, hi, z0, z1) => rect(...lo).loft([rect(...hi)], {
  planes: [{ plane: 'XY', origin: [0, 0, z0] }, { plane: 'XY', origin: [0, 0, z1] }],
  ruled: true,
});
// Small faceted rock resting on z = 0, turned by k so no two look alike.
const rock = (r, k) => lathe([[r * 0.75, 0], [r, r * 0.4], [r * 0.5, r * 0.85]], 5).rotateZ(k * 47).scale([1.15, 0.9, 1]);

const belt = '#26292b', shaft = '#9aa2a6', waste = '#6d6b67', glass = '#24323b', warn = '#f2c21b';
const ZB = 2200; // belt top
const BW = 600; // half belt width
const XT = -4200; // tail pulley

// ---- Conveyor ----
add('belt', blk(XT, -BW, ZB - 20, 0, BW, ZB).color(belt));
add('belt-return', blk(XT, -BW + 40, ZB - 440, 0, BW - 40, ZB - 420).color(belt));
for (const [k, x] of [XT, 0].entries()) add(`pulley-${k}`, latheY([[200, -BW - 20], [200, BW + 20]], x, ZB - 220, 14).color(frameSteel));
for (const [k, s] of [-1, 1].entries()) {
  add(`side-frame-${k}`, blk(XT - 250, s * (BW + 40) - 20, ZB - 520, 150, s * (BW + 40) + 20, ZB + 80).color(housingPaint));
  add(`side-stripe-${k}`, blk(XT - 250, s * (BW + 62) - 3, ZB - 120, 150, s * (BW + 62) + 3, ZB - 40).color(accent));
  for (const [j, x] of [XT + 100, -2200, -200].entries()) add(`leg-${k}-${j}`, blk(x - 70, s * (BW + 40) - 70, 0, x + 70, s * (BW + 40) + 70, ZB - 520).color(frameSteel));
}
// Rocks spread in a single layer on the belt.
for (let i = 0; i < 16; i++) {
  const x = -2900 + i * 175, y = ((i * 337) % 900) - 450, r = 55 + ((i * 29) % 45);
  add(`rock-belt-${i}`, rock(r, i).translate(x, y, ZB).color(i % 5 === 2 ? waste : ore));
}

// ---- Vibrating feeder at the tail ----
const FZ = ZB + 300;
add('feeder-tray', blk(-4900, -560, FZ, -3100, 560, FZ + 40).color(frameSteel));
for (const [k, s] of [-1, 1].entries()) {
  add(`feeder-wall-${k}`, blk(-4900, s * 560 - (s < 0 ? 20 : 0), FZ + 40, -3100, s * 560 + (s > 0 ? 20 : 0), FZ + 320).color(frameSteel));
  add(`feeder-motor-${k}`, latheY([[150, s > 0 ? 580 : -930], [150, s > 0 ? 930 : -580]], -4300, FZ + 150, 10).color(accent));
  for (const [j, x] of [-4700, -3500].entries()) {
    add(`feeder-spring-${k}-${j}`, rod(55, FZ - 420, FZ, 8).translate(x, s * 640, 0).color(warn));
    add(`feeder-post-${k}-${j}`, blk(x - 80, s * 640 - 80, 0, x + 80, s * 640 + 80, FZ - 420).color(frameSteel));
  }
}
add('feed-hopper', taper([-4800, -3900, -450, 450], [-5100, -3500, -800, 800], FZ + 320, FZ + 1300).color(housingPaint));
for (let i = 0; i < 6; i++) add(`rock-feeder-${i}`, rock(60 + (i % 3) * 15, i + 20).translate(-3900 + i * 140, ((i * 251) % 700) - 350, FZ + 40).color(ore));

// ---- Sensor arch ----
const AX0 = -1750, AX1 = -750;
for (const [k, s] of [-1, 1].entries()) add(`arch-column-${k}`, blk(AX0, s * 900 - 120, 0, AX1, s * 900 + 120, ZB + 1300).color(accent));
add('arch-head', blk(AX0 - 50, -1020, ZB + 900, AX1 + 50, 1020, ZB + 1400).color(housingPaint));
add('arch-head-band', blk(AX0 - 60, -1030, ZB + 1150, AX1 + 60, 1030, ZB + 1230).color(accent));
if (sensor.value === 'xrt') {
  add('xray-source', blk(-1500, -320, ZB + 1400, -1000, 320, ZB + 1800).color(housingPaint));
  add('xray-warning', blk(-1360, -335, ZB + 1520, -1140, -320, ZB + 1700).color(warn));
  add('detector-line', blk(-1350, -680, ZB - 400, -1150, 680, ZB - 60).color(accent));
  // Shielding tunnel over the belt either side of the arch, with lead curtains at the ends.
  for (const [k, [x0, x1]] of [[-3100, AX0], [AX1, -350]].entries()) {
    add(`tunnel-roof-${k}`, blk(x0, -BW - 60, ZB + 450, x1, BW + 60, ZB + 500).color(housingPaint));
    for (const [j, s] of [-1, 1].entries()) add(`tunnel-wall-${k}-${j}`, blk(x0, s * (BW + 60) - 20, ZB + 80, x1, s * (BW + 60) + 20, ZB + 450).color(housingPaint));
  }
  for (const [k, x] of [-3100, -350].entries()) {
    for (let i = 0; i < 8; i++) add(`curtain-${k}-${i}`, blk(x - 6, -BW + 10 + i * 150, ZB + 140, x + 6, -BW + 140 + i * 150, ZB + 450).color(belt));
  }
} else {
  add('camera-bar', blk(-1400, -900, ZB + 700, -1100, 900, ZB + 900).color(frameSteel));
  for (let i = 0; i < 4; i++) add(`camera-lens-${i}`, rod(45, ZB + 650, ZB + 700, 10).translate(-1250, -600 + i * 400, 0).color(glass));
  for (const [k, s] of [-1, 1].entries()) {
    add(`light-line-${k}`, latheY([[55, -880], [55, 880]], -1250 + s * 320, ZB + 560, 8).color('#fbf4c4'));
    add(`light-housing-${k}`, latheY([[85, -900], [85, 880 + 20]], -1250 + s * 400, ZB + 610, 8).color(frameSteel));
  }
  add('background-plate', blk(-1450, -BW - 40, ZB - 330, -1050, BW + 40, ZB - 200).color(accent));
}

// ---- Ejector, splitter and rocks in flight ----
add('valve-manifold', blk(80, -680, ZB + 260, 420, 680, ZB + 480).color(accent));
add('air-header', latheY([[90, -760], [90, 760]], 250, ZB + 580, 10).color(shaft));
for (let i = 0; i < 12; i++) add(`nozzle-${i}`, blk(225, -620 + i * 112, ZB + 200, 275, -580 + i * 112, ZB + 260).color(frameSteel));
add('splitter-plate', prismY([[880, ZB - 1150], [1120, ZB - 1150], [1000, ZB - 600]], -700, 700).color(frameSteel));
// Accepted rocks follow the ballistic arc off the belt (3 m/s) over the splitter.
for (const [i, t] of [0.08, 0.16, 0.24, 0.32, 0.4, 0.47].entries()) {
  add(`rock-flight-${i}`, rock(60 + (i % 3) * 12, i + 40).translate(3000 * t, ((i * 271) % 600) - 300, ZB + 20 - 4905 * t * t).color(ore));
}
// Rejected rocks blown down off the arc into the near chute.
for (const [i, [x, z]] of [[230, ZB - 120], [360, ZB - 380], [450, ZB - 680]].entries()) {
  add(`rock-ejected-${i}`, rock(62, i + 60).translate(x, -150 + i * 140, z).color(waste));
}

// ---- Chutes and cross belts ----
const ZC = 450; // cross belt top
add('waste-chute', taper([150, 750, -450, 450], [-50, 950, -650, 650], ZC + 250, ZB - 1150).color(housingPaint));
add('product-chute', taper([1300, 2100, -450, 450], [1050, 2550, -650, 650], ZC + 250, ZB - 1150).color(housingPaint));
for (const [k, [xc, colour]] of [[450, waste], [1700, ore]].entries()) {
  add(`cross-belt-${k}`, blk(xc - 500, -2600, ZC - 20, xc + 500, 1200, ZC).color(belt));
  for (const [j, s] of [-1, 1].entries()) add(`cross-frame-${k}-${j}`, blk(xc + s * 540 - 30, -2600, 0, xc + s * 540 + 30, 1200, ZC + 40).color(frameSteel));
  add(`cross-pulley-${k}`, rod(160, 0, 1000, 12).rotateY(90).translate(xc - 500, -2600, ZC - 160).color(frameSteel));
  for (let i = 0; i < 6; i++) add(`cross-rock-${k}-${i}`, rock(55 + (i % 2) * 20, i + 80 + k * 10).translate(xc - 250 + ((i * 193) % 500), -2400 + i * 380, ZC).color(colour));
}

// ---- Discharge housing ----
const HX0 = -250, HX1 = 2700, HY = 950, HZ = ZB + 900;
for (const [k, [x, y]] of [[HX0, -HY], [HX1, -HY], [HX1, HY], [HX0, HY]].entries()) add(`housing-post-${k}`, blk(x - 60, y - 60, ZC + 60, x + 60, y + 60, HZ).color(frameSteel));
add('housing-roof', blk(HX0 - 80, -HY - 80, HZ, HX1 + 80, HY + 80, HZ + 80).color(housingPaint));
add('housing-back', blk(HX0, HY - 20, ZB - 1150, HX1, HY + 20, HZ).color(housingPaint));
add('housing-end', blk(HX1 - 20, -HY, ZB - 1150, HX1 + 20, HY, HZ).color(housingPaint));
add('housing-band', blk(HX1 + 20, -HY, HZ - 260, HX1 + 30, HY, HZ - 180).color(accent));
if (housing.value === 'closed') {
  add('housing-front', blk(HX0, -HY - 20, ZB - 1150, HX1, -HY + 20, HZ).color(housingPaint));
  add('housing-window', blk(HX0 + 600, -HY - 30, ZB - 300, HX1 - 600, -HY - 20, ZB + 500).color(glass));
}

// ---- Control cabinet ----
add('cabinet', blk(-3700, -1800, 0, -2700, -1300, 2100).color(housingPaint));
add('cabinet-plinth', blk(-3720, -1820, 0, -2680, -1280, 100).color(frameSteel));
add('cabinet-split', blk(-3205, -1810, 150, -3195, -1800, 2050).color(frameSteel));
add('hmi-screen', blk(-3600, -1815, 1300, -3260, -1800, 1600).color(glass));
for (const [k, x] of [-3080, -2820].entries()) add(`cabinet-handle-${k}`, blk(x - 15, -1830, 900, x + 15, -1800, 1150).color(frameSteel));
add('stack-pole', rod(25, 2100, 2250, 8).translate(-2850, -1550, 0).color(frameSteel));
for (const [k, c] of ['#2ea84a', '#f2a51b', '#d6342c'].entries()) add(`stack-light-${k}`, rod(60, 2250 + k * 130, 2370 + k * 130, 10).translate(-2850, -1550, 0).color(c));

return p.model();
