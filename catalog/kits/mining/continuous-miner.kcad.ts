// SPDX-License-Identifier: CC0-1.0
// Continuous miner, the room-and-pillar coal and soft-rock machine that cuts
// and loads in one pass. What makes it one: a low, wide crawler body with a
// full-width cutter drum on a hinged boom at the front, studded with
// helical rows of conical picks, that shears up and down the face. Under the
// drum a flat loading pan with two spinning gathering heads sweeps the cut
// coal into a chain conveyor that runs up through the middle of the machine
// and out over a tail boom into the shuttle car behind. A dust scrubber duct
// runs along one side, a trailing-cable reel sits at the back and the
// operator rides in a canopied deck at the rear corner.
// Millimetres, Z up, cutting face towards +X, tail boom towards -X.
meta({
  name: "continuous-miner",
  license: 'CC0-1.0',
  title: "Continuous miner",
  description: "Room-and-pillar continuous miner at about real size: low crawler body on two tracks with grouser shoes, full-width cutter drum in three sections on a hinged boom with lift cylinders and helical rows of conical picks, loading pan with flared side plates and two three-arm gathering heads, centre chain conveyor carrying cut coal up to a tail conveyor boom, electrical and hydraulic enclosures, dust scrubber duct and fan box, trailing-cable reel with cable on the floor, canopied operator deck, headlights and water sprays. Material controls: machine paint, frame and track steel, wear steel for drum and picks, rubber and cable, plus a cutter height choice (floor, sumping, roof). weathered, sandvikYellow and highVisibility presets.",
  tags: ['mining', 'underground', 'coal', 'continuous miner', 'room and pillar', 'cutter drum', 'crawler', 'mining machine'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'underground', 'industrial', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const machinePaint = param('machinePaint', '#e4dcc4', { label: 'Machine paint' });
const frameSteel = param('frameSteel', '#4b5459', { label: 'Frame and track steel' });
const wearSteel = param('wearSteel', '#9a9e9b', { label: 'Drum and pick wear steel' });
const rubber = param('rubber', '#25292b', { label: 'Rubber and cable' });
const cutterHeight = param('cutterHeight', 'sumping', { choices: ['floor', 'sumping', 'roof'], label: 'Cutter drum height' });
presets({
  weathered: { machinePaint: '#a59d88', frameSteel: '#5f625f', wearSteel: '#7a756e', rubber: '#393a38' },
  sandvikYellow: { machinePaint: '#e9b821', frameSteel: '#33383b', wearSteel: '#a3a7a4', rubber: '#202325' },
  highVisibility: { machinePaint: '#f08a1c', frameSteel: '#465159', wearSteel: '#b0b5b2', rubber: '#24282a' },
});

const p = assembly("continuous-miner");
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

const coal = '#1c1c1f', coalLit = '#2e2f33', lamp = '#fff1b0', warn = '#e8c21e';

// ---- Crawler tracks with grouser shoes and drive sprockets ----
const trackOutline = [[-3000, 0], [2000, 0], [2300, 300], [2050, 650], [-3050, 650], [-3300, 300]];
for (const [k, yc] of [-1350, 1350].entries()) {
  add(`track-${k}`, profileXZ(trackOutline, 560).translate(0, yc, 0).color(frameSteel));
  for (let i = 0; i < 14; i++) {
    const x = -2850 + i * 350;
    add(`grouser-${k}-${i}`, blk(x - 60, yc - 280, 650, x + 60, yc + 280, 700).color(frameSteel));
  }
  const yo = yc + Math.sign(yc) * 280;
  add(`drive-sprocket-${k}`, cylY(300, Math.min(yo, yo + Math.sign(yc) * 120), Math.max(yo, yo + Math.sign(yc) * 120), -2950, 330, 10).color(wearSteel));
  add(`idler-hub-${k}`, cylY(200, Math.min(yo, yo + Math.sign(yc) * 80), Math.max(yo, yo + Math.sign(yc) * 80), 1950, 330, 10).color(frameSteel));
}

// ---- Main frame in two halves either side of the centre conveyor ----
for (const [k, s] of [-1, 1].entries()) {
  const y0 = s < 0 ? -1080 : 450, y1 = s < 0 ? -450 : 1080;
  add(`frame-half-${k}`, blk(-3600, y0, 250, 2200, y1, 1350).color(machinePaint));
  add(`frame-bumper-${k}`, blk(2200, y0, 250, 2350, y1, 1100).color(frameSteel));
  add(`headlight-${k}`, blk(2350, s * 950 - 90, 950, 2400, s * 950 + 90, 1050).color(lamp));
  add(`spray-bar-${k}`, tube([2250, s * 500, 1350], [2250, s * 1050, 1350], 35, 6).color(wearSteel));
}
add('rear-bumper', blk(-3750, -1080, 250, -3600, 1080, 900).color(warn));

// ---- Loading pan with gathering heads ----
add('loading-pan', profileXZ([[2200, 0], [4500, 0], [4500, 40], [3900, 300], [2200, 300]], 3800).color(frameSteel));
for (const [k, s] of [-1, 1].entries()) {
  add(`pan-side-plate-${k}`, profileXZ([[2300, 300], [3900, 300], [3900, 360], [2300, 650]], 60).translate(0, s * 1900, 0).color(frameSteel));
  const gy = s * 850;
  add(`gathering-disc-${k}`, rod(560, 300, 380, 12).translate(3150, gy, 0).color(wearSteel));
  add(`gathering-hub-${k}`, rod(180, 380, 520, 8).translate(3150, gy, 0).color(frameSteel));
  for (let j = 0; j < 3; j++) {
    add(`gathering-arm-${k}-${j}`, blk(0, -70, 380, 620, 70, 470).rotateZ(s * 40 + j * 120).translate(3150, gy, 0).color(wearSteel));
  }
}
for (const [k, [x, y, r]] of [[3700, -300, 190], [3500, 450, 150], [2900, -1300, 170], [2700, 1250, 140], [3900, 1100, 120]].entries()) {
  add(`coal-lump-pan-${k}`, sphere(r).scale([1.2, 1, 0.7]).translate(x, y, 300 + r * 0.55).color(k % 2 ? coalLit : coal));
}

// ---- Centre chain conveyor rising through the machine ----
const S = [2300, 300], E = [-3600, 1300];
const cLen = Math.hypot(E[0] - S[0], E[1] - S[1]);
const cAng = (Math.atan2(E[1] - S[1], E[0] - S[0]) * 180) / Math.PI;
const onConv = (s) => s.rotateY(-cAng).translate(S[0], 0, S[1]);
add('conveyor-deck', onConv(blk(0, -440, -60, cLen, 440, 0)).color(wearSteel));
for (const [k, y] of [-440, 440].entries()) add(`conveyor-side-${k}`, onConv(blk(0, y - 30, 0, cLen, y + 30, 260)).color(frameSteel));
for (let i = 0; i < 8; i++) add(`conveyor-flight-${i}`, onConv(blk(300 + i * 700, -400, 0, 360 + i * 700, 400, 50)).color(frameSteel));
add('conveyor-coal', onConv(extrudePolygon([[-380, 0], [380, 0], [200, 200], [-150, 230]], cLen - 400).rotateY(90).rotateX(90).translate(200, 0, 0)).color(coal));

// ---- Tail conveyor boom ----
const T = [-7300, 2150];
const tLen = Math.hypot(T[0] - E[0], T[1] - E[1]);
const tAng = (Math.atan2(T[1] - E[1], T[0] - E[0]) * 180) / Math.PI;
const onTail = (s) => s.rotateY(-tAng).translate(E[0], 0, E[1]);
add('tail-boom-deck', onTail(blk(-200, -420, -260, tLen, 420, 0)).color(machinePaint));
for (const [k, y] of [-420, 420].entries()) add(`tail-boom-side-${k}`, onTail(blk(-200, y - 30, 0, tLen, y + 30, 240)).color(frameSteel));
add('tail-boom-coal', onTail(extrudePolygon([[-360, 0], [360, 0], [180, 170], [-120, 190]], tLen - 300).rotateY(90).rotateX(90).translate(0, 0, 0)).color(coal));
add('tail-pulley', cylY(220, -430, 430, T[0], T[1] - 130, 10).color(wearSteel));
add('tail-swing-pivot', rod(420, 1250, 1400, 10).translate(E[0] + 150, 0, 0).color(frameSteel));
for (const [k, y] of [-380, 380].entries()) add(`tail-lift-cylinder-${k}`, tube([-3500, y, 900], [-5200, y, 1600], 70, 6).color(wearSteel));

// ---- Electrical, hydraulic, scrubber and cable reel ----
add('electrical-enclosure', blk(-3300, -1080, 1350, -600, -520, 1700).color(machinePaint));
for (const [k, x] of [-2700, -1500].entries()) add(`enclosure-door-${k}`, blk(x - 450, -1100, 1400, x + 450, -1080, 1660).color(frameSteel));
add('hydraulic-tank', blk(-1800, 520, 1350, 200, 1080, 1720).color(machinePaint));
add('tank-filler', rod(80, 1720, 1820, 8).translate(-400, 800, 0).color(wearSteel));
add('scrubber-duct', tube([2150, 1350, 900], [-1600, 1350, 900], 190, 10).color(machinePaint));
add('scrubber-inlet', blk(2100, 1150, 700, 2350, 1550, 1100).color(frameSteel));
add('scrubber-fan-box', blk(-2900, 1080, 700, -1500, 1700, 1400).color(machinePaint));
add('scrubber-exhaust', cylY(260, 1700, 1800, -2200, 1050, 10).color(frameSteel));
add('cable-reel', rod(520, 1350, 1800, 14).translate(-3000, 780, 0).color(frameSteel));
add('cable-wraps', rod(460, 1420, 1730, 14).translate(-3000, 780, 0).color(rubber));
add('trailing-cable-drop', tube([-3450, 900, 1550], [-5000, 1500, 60], 45, 6).color(rubber));
add('trailing-cable-floor', tube([-5000, 1500, 50], [-7600, 2200, 50], 45, 6).color(rubber));

// ---- Canopied operator deck at the rear left corner ----
add('operator-deck', blk(-3600, -1750, 1350, -2200, -1080, 1420).color(frameSteel));
add('operator-seat', blk(-3200, -1600, 1420, -2750, -1200, 1700).color(rubber));
add('control-console', blk(-2650, -1650, 1420, -2300, -1150, 1900).color(machinePaint));
for (const [k, [x, y]] of [[-3550, -1700], [-3550, -1130], [-2250, -1700], [-2250, -1130]].entries()) {
  add(`canopy-post-${k}`, rod(45, 1420, 2250, 6).translate(x, y, 0).color(frameSteel));
}
add('canopy-roof', blk(-3650, -1780, 2250, -2150, -1050, 2330).color(machinePaint));

// ---- Cutter boom, drum and picks ----
const P = [1900, 1250], L = 3000;
const drumZ = { floor: 710, sumping: 1800, roof: 3000 }[cutterHeight.value];
const a = Math.asin((drumZ - P[1]) / L), aDeg = (a * 180) / Math.PI;
const boom = (s) => s.rotateY(-aDeg).translate(P[0], 0, P[1]);
const boomPt = (u, w) => [P[0] + u * Math.cos(a) - w * Math.sin(a), P[1] + u * Math.sin(a) + w * Math.cos(a)];
for (const [k, [y0, y1]] of [[-1250, -1050], [1050, 1250]].entries()) {
  add(`boom-gearcase-${k}`, boom(blk(-250, y0, -320, L, y1, 320)).color(machinePaint));
  add(`drum-hub-${k}`, boom(cylY(430, y0 - 20, y1 + 20, L, 0, 12)).color(frameSteel));
}
add('boom-body', boom(blk(-200, -1050, -260, 1700, 1050, 260)).color(machinePaint));
add('boom-motor-cover', boom(blk(300, -900, 260, 1800, 900, 520)).color(machinePaint));
add('boom-pivot', cylY(220, -1300, 1300, P[0], P[1], 10).color(frameSteel));
for (const [k, y] of [-750, 750].entries()) {
  const top = boomPt(1400, -260);
  add(`boom-lift-cylinder-${k}`, tube([1500, y, 450], [top[0], y, top[1]], 110, 8).color(wearSteel));
}
const segments = [[-1700, -1250], [-1050, 1050], [1250, 1700]];
for (const [k, [y0, y1]] of segments.entries()) {
  add(`cutter-drum-${k}`, boom(cylY(540, y0, y1, L, 0, 16)).color(wearSteel));
  for (let y = y0 + 80, i = 0; y < y1 - 40; y += 150, i++) {
    const th = (y + 1700) * 0.24;
    for (const [j, off] of [0, 180].entries()) {
      add(`pick-${k}-${i}-${j}`, boom(lathe([[50, 520], [34, 660], [8, 740]], 6).rotateY(th + off).translate(L, y, 0)).color(frameSteel));
    }
  }
}

return p.model();
