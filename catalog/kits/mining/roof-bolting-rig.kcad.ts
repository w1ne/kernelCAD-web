// SPDX-License-Identifier: CC0-1.0
// Underground roof-bolting rig, the twin-boom machine that follows the
// continuous miner and pins the freshly exposed roof with rock bolts. What
// makes it one: two upright drill masts at the front corners, each with a
// drill head that climbs the mast to push a drill steel into the roof and
// then spin a bolt in. Ahead of the masts a wide automated temporary roof
// support (ATRS) beam is jacked up against the roof on hydraulic cylinders
// so the bolters work under supported ground, and each bolter stands on a
// low platform beside his mast under a steel canopy with a bank of drill
// levers. The back of the machine carries the dust collector that vacuums
// the drill cuttings, the hydraulic tank and the cable reel.
// Millimetres, Z up, working end towards +X, crawler tracks along X.
meta({
  name: "roof-bolting-rig",
  license: 'CC0-1.0',
  title: "Roof-bolting rig",
  description: "Twin-boom crawler roof bolter at about real size: crawler tracks with grouser shoes, low chassis with deck, two drill masts on swing booms with climbing drill heads, chucks, drill steels and centralisers, ATRS roof-support beam on twin lift cylinders, two operator platforms with lever banks under canopies on posts, bolt and resin magazines, dust collector box with vacuum hoses to the masts, hydraulic tank, electrical enclosure and cable reel with trailing cable. Material controls: machine paint, frame and track steel, drill steel and chrome, hoses and rubber, plus a mast choice (stowed for tramming, drilling with masts and ATRS raised to a 3.2 m roof). weathered, permissibleWhite and highVisibility presets.",
  tags: ['mining', 'underground', 'coal', 'roof bolter', 'rock bolting', 'ground support', 'ATRS', 'mining machine'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'underground', 'industrial', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const machinePaint = param('machinePaint', '#e3bf2a', { label: 'Machine paint' });
const frameSteel = param('frameSteel', '#4b5459', { label: 'Frame and track steel' });
const drillSteel = param('drillSteel', '#b9bfc1', { label: 'Drill steel and chrome' });
const hoses = param('hoses', '#25292b', { label: 'Hoses and rubber' });
const mastState = param('mastState', 'drilling', { choices: ['stowed', 'drilling'], label: 'Masts' });
presets({
  weathered: { machinePaint: '#9a8752', frameSteel: '#5f625f', drillSteel: '#8f918d', hoses: '#393a38' },
  permissibleWhite: { machinePaint: '#e6e2d6', frameSteel: '#33383b', drillSteel: '#a9aeb0', hoses: '#1f2224' },
  highVisibility: { machinePaint: '#f08a1c', frameSteel: '#465159', drillSteel: '#c5ccca', hoses: '#24282a' },
});

const p = assembly("roof-bolting-rig");
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
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Round bar along Y from y0 to y1, centred on (x, z).
const cylY = (r, y0, y1, x, z, n = 12) => rod(r, -y1, -y0, n).rotateX(90).translate(x, 0, z);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// (x, z) outline extruded along Y, centred on y = 0.
const profileXZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

const lamp = '#fff1b0', warn = '#e8c21e', resin = '#c8562a', boltSteel = '#6f7477';
const drilling = mastState.value === 'drilling';
const ROOF = 3200;
const mastTop = drilling ? ROOF - 60 : 2100;
const atrsZ = drilling ? ROOF - 200 : 1950;
const DECK = 900;

// ---- Crawler tracks ----
const trackOutline = [[-3500, 0], [2400, 0], [2700, 300], [2450, 620], [-3550, 620], [-3800, 300]];
for (const [k, yc] of [-1300, 1300].entries()) {
  add(`track-${k}`, profileXZ(trackOutline, 500).translate(0, yc, 0).color(frameSteel));
  for (let i = 0; i < 16; i++) {
    const x = -3350 + i * 360;
    add(`grouser-${k}-${i}`, blk(x - 55, yc - 250, 620, x + 55, yc + 250, 670).color(frameSteel));
  }
  const yo = yc + Math.sign(yc) * 250;
  add(`drive-sprocket-${k}`, cylY(280, Math.min(yo, yo + Math.sign(yc) * 100), Math.max(yo, yo + Math.sign(yc) * 100), -3450, 310, 10).color(drillSteel));
}

// ---- Chassis and deck ----
add('chassis', blk(-3900, -1050, 300, 2900, 1050, DECK).color(machinePaint));
add('deck-plate', blk(-3900, -1550, DECK, 2500, 1550, DECK + 40).color(frameSteel));
add('rear-bumper', blk(-4050, -1050, 300, -3900, 1050, 750).color(warn));
for (const [k, y] of [-800, 800].entries()) add(`rear-lamp-${k}`, blk(-4080, y - 90, 600, -4050, y + 90, 700).color(lamp));

// ---- ATRS roof-support beam ----
add('atrs-beam', blk(3500, -1650, atrsZ, 3800, 1650, atrsZ + 200).color(machinePaint));
for (const [k, y] of [-1500, 1500].entries()) add(`atrs-pad-${k}`, blk(3450, y - 150, atrsZ + 200, 3850, y + 150, atrsZ + 240).color(hoses));
for (const [k, y] of [-500, 500].entries()) {
  add(`atrs-cylinder-${k}`, rod(120, 600, 600 + (atrsZ - 600) * 0.55, 10).translate(3650, y, 0).color(machinePaint));
  add(`atrs-ram-${k}`, rod(75, 600 + (atrsZ - 600) * 0.5, atrsZ, 10).translate(3650, y, 0).color(drillSteel));
  add(`atrs-mount-${k}`, blk(2900, y - 150, 450, 3700, y + 150, 650).color(frameSteel));
}

// ---- Twin drill masts on swing booms ----
for (const [k, s] of [-1, 1].entries()) {
  const ym = s * 1250, xm = 3150;
  add(`swing-boom-${k}`, blk(2300, ym - 140, 700, xm + 150, ym + 140, 900).color(machinePaint));
  add(`boom-pivot-${k}`, rod(170, 650, 950, 10).translate(2400, ym, 0).color(frameSteel));
  add(`mast-${k}`, blk(xm - 130, ym - 130, 700, xm + 130, ym + 130, mastTop).color(machinePaint));
  add(`mast-slide-${k}`, blk(xm - 170, ym - 60, 800, xm - 130, ym + 60, mastTop - 100).color(drillSteel));
  add(`mast-feed-cylinder-${k}`, rod(55, 800, mastTop - 200, 8).translate(xm + 180, ym, 0).color(drillSteel));
  const headZ = drilling ? 1700 : 1000;
  add(`drill-head-${k}`, blk(xm - 420, ym - 200, headZ, xm - 170, ym + 200, headZ + 380).color(frameSteel));
  add(`drill-motor-${k}`, rod(120, headZ + 380, headZ + 560, 10).translate(xm - 295, ym + s * 60, 0).color(machinePaint));
  add(`chuck-${k}`, rod(90, headZ + 380, headZ + 470, 8).translate(xm - 295, ym - s * 80, 0).color(drillSteel));
  add(`drill-steel-${k}`, rod(22, headZ + 470, mastTop + (drilling ? 50 : -150), 6).translate(xm - 295, ym - s * 80, 0).color(drillSteel));
  add(`centraliser-${k}`, blk(xm - 400, ym - s * 80 - 120, mastTop - 160, xm - 190, ym - s * 80 + 120, mastTop - 60).color(warn));
  add(`dust-hose-drop-${k}`, tube([xm - 420, ym, headZ + 100], [2300, s * 1450, DECK + 100], 55, 6).color(hoses));
  add(`dust-hose-run-${k}`, tube([2300, s * 1450, DECK + 100], [-1900, s * 1450, DECK + 100], 55, 6).color(hoses));
}

// ---- Operator platforms with lever banks and canopies ----
for (const [k, s] of [-1, 1].entries()) {
  const y0 = s < 0 ? -950 : 300, y1 = s < 0 ? -300 : 950;
  add(`platform-${k}`, blk(2000, y0, 500, 3300, y1, 580).color(frameSteel));
  add(`lever-bank-${k}`, blk(2950, y0 + 80, 580, 3250, y1 - 80, 1250).color(machinePaint));
  for (let i = 0; i < 4; i++) {
    add(`lever-${k}-${i}`, tube([3000, y0 + 140 + i * 130, 1250], [2900, y0 + 140 + i * 130, 1500], 18, 4).color(i === 0 ? '#c8322b' : hoses));
  }
  for (const [j, [x, y]] of [[2050, y0 + 40], [2050, y1 - 40], [3250, y0 + 40], [3250, y1 - 40]].entries()) {
    add(`canopy-post-${k}-${j}`, rod(40, 580, 2350, 6).translate(x, y, 0).color(frameSteel));
  }
  add(`canopy-${k}`, blk(1950, y0 - 40, 2350, 3350, y1 + 40, 2420).color(machinePaint));
  add(`work-light-${k}`, blk(3350, (y0 + y1) / 2 - 90, 2250, 3380, (y0 + y1) / 2 + 90, 2340).color(lamp));
}

// ---- Bolt and resin magazines on the deck ----
for (const [k, s] of [-1, 1].entries()) {
  const yc = s * 1250;
  add(`bolt-rack-${k}`, blk(500, yc - 250, DECK + 40, 1800, yc + 250, DECK + 140).color(frameSteel));
  for (let i = 0; i < 4; i++) {
    add(`roof-bolt-${k}-${i}`, tube([550, yc - 180 + i * 120, DECK + 190], [1750, yc - 180 + i * 120, DECK + 190], 20, 6).color(boltSteel));
  }
  add(`bearing-plates-${k}`, blk(1850, yc - 150, DECK + 40, 2150, yc + 150, DECK + 260).color(boltSteel));
  add(`resin-box-${k}`, blk(-200, yc - 230, DECK + 40, 350, yc + 230, DECK + 380).color(resin));
}

// ---- Dust collector, hydraulic tank, electrics, cable reel ----
add('dust-collector', blk(-3800, -1200, DECK + 40, -1900, 100, 2000).color(machinePaint));
add('dust-collector-hopper', profileXZ([[-3800, 2000], [-1900, 2000], [-2300, 2300], [-3400, 2300]], 1300).translate(0, -550, 0).color(machinePaint));
for (const [k, x] of [-3450, -3000, -2550, -2100].entries()) add(`filter-door-${k}`, blk(x - 170, -1220, DECK + 300, x + 170, -1200, 1800).color(frameSteel));
add('vacuum-exhaust', rod(180, 2300, 2500, 10).translate(-2850, -550, 0).color(frameSteel));
add('hydraulic-tank', blk(-1700, 300, DECK + 40, -300, 1150, 1700).color(machinePaint));
add('tank-filler', rod(70, 1700, 1800, 8).translate(-700, 700, 0).color(drillSteel));
add('electrical-enclosure', blk(-1700, -1150, DECK + 40, -300, -400, 1550).color(frameSteel));
add('enclosure-door', blk(-1500, -1170, DECK + 150, -500, -1150, 1450).color(machinePaint));
add('cable-reel', rod(550, DECK + 40, DECK + 500, 14).translate(-3000, 750, 0).color(frameSteel));
add('cable-wraps', rod(490, DECK + 100, DECK + 440, 14).translate(-3000, 750, 0).color(hoses));
add('trailing-cable', tube([-3450, 900, DECK + 250], [-6000, 1300, 60], 45, 6).color(hoses));

return p.model();
