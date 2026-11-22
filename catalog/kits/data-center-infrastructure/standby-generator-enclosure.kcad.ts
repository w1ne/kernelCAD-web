// SPDX-License-Identifier: CC0-1.0
// Standby generator enclosure: the diesel genset in its weatherproof sound-
// attenuated canopy that backs up a data centre's utility feed. What makes it
// one: a long canopy with a pitched rain roof sitting on a double-wall
// sub-base fuel tank, three lockable service doors down the side with
// louvred intake panels, a radiator discharge hood turned up at one end, the
// control-panel viewing window and red emergency stop at the other, a roof
// mounted exhaust silencer on saddles with a rain-capped tailpipe, lifting
// eyes at the roof corners, and the tank's fill cap, vent and level gauge.
// Millimetres, Z up, the length runs along X, the doors face -Y and the
// control end faces -X.
meta({
  name: "standby-generator-enclosure",
  license: 'CC0-1.0',
  title: "Standby generator enclosure",
  description: "Sound-attenuated standby diesel genset: pitched-roof canopy on a sub-base fuel tank with fill cap, vent and level gauge, three service doors with hinges, latch handles and louvred intakes, radiator discharge hood, control-panel viewing window and red emergency stop, roof exhaust silencer on saddles with flex joint and rain-capped tailpipe, and four lifting eyes. Material controls: canopy paint, louvres and trim, fuel-tank base, exhaust and safety accent; constructionYellow, utilityGreen and weathered presets.",
  tags: ['data center', 'power', 'generator', 'genset', 'diesel', 'standby power', 'backup', 'critical infrastructure', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 8000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const canopy = param('canopy', '#d8d5c7', { label: 'Canopy paint' });
const trim = param('trim', '#3a3e42', { label: 'Louvres, seams and hardware' });
const tank = param('tank', '#2a2c2e', { label: 'Sub-base fuel tank' });
const exhaust = param('exhaust', '#9a958d', { label: 'Exhaust silencer and pipe' });
const accent = param('accent', '#c8221c', { label: 'Emergency stop and fill cap' });

presets({
  constructionYellow: { canopy: '#e7b416', trim: '#25272a' },
  utilityGreen: { canopy: '#3f6b4a', trim: '#1f2522', tank: '#26292a' },
  weathered: { canopy: '#bdb7a3', trim: '#45443f', tank: '#38342f', exhaust: '#7a5c45', accent: '#a5352a' },
});

const p = assembly("standby-generator-enclosure");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const ring = (r0, r1, z0, z1) => turned([[r0, z0], [r1, z0], [r1, z1], [r0, z1]]);
const rod = (r, z0, z1) => turned([[0, z0], [r, z0], [r, z1], [0, z1]]);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Cross-section [[y, z], ...] extruded along X from x0 to x1.
const prismX = (pts, x0, x1) => extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
// Turned parts with the axis along +X, along -X, along -Y.
const alongX = (shape) => shape.rotateY(90);
const outOfEnd = (shape) => shape.rotateY(-90);
const facingFront = (shape) => shape.rotateX(90);

// Fixed trade colours: tinted viewing glass and the yellow E-stop housing.
const windowGlass = '#3c6f8f', estopYellow = '#e9c21f';

const L = 1700, W = 650; // half length, half width
const tankTop = 480, eave = 2050, ridge = 2200;

// ---- Sub-base fuel tank: fill cap, vent, level gauge, fork pockets ----
add('fuel-tank', blk(-L - 30, -W - 30, 0, L + 30, W + 30, tankTop).color(tank));
add('tank-lip', blk(-L - 50, -W - 50, tankTop - 40, L + 50, W + 50, tankTop).color(tank));
for (const x of [-900, 900]) {
  add(`fork-pocket-${x}`, blk(x - 200, -W - 36, 60, x + 200, -W - 30, 200).color(trim));
}
add('fill-neck', facingFront(rod(55, 0, 90)).translate(-1200, -W - 30, 330).color(tank));
add('fill-cap', facingFront(turned([[0, 90], [75, 90], [75, 130], [0, 130]])).translate(-1200, -W - 30, 330).color(accent));
add('level-gauge', facingFront(turned([[0, 0], [70, 0], [70, 20], [60, 30], [0, 30]])).translate(-850, -W - 30, 300).color(trim));
add('level-gauge-face', facingFront(rod(58, 30, 33)).translate(-850, -W - 30, 300).color(canopy));
add('tank-vent', rod(25, tankTop, 1450).translate(-L - 70, W - 120, 0).color(trim));
add('tank-vent-cap', turned([[0, 1450], [55, 1450], [0, 1520]]).translate(-L - 70, W - 120, 0).color(trim));

// ---- Canopy body with pitched rain roof ----
add('canopy-body', blk(-L, -W, tankTop, L, W, eave).color(canopy));
add('roof', prismX([[-W - 40, eave], [W + 40, eave], [W + 40, eave + 30], [0, ridge], [-W - 40, eave + 30]], -L - 40, L + 40).color(canopy));
add('drip-edge', blk(-L - 40, -W - 50, eave - 30, L + 40, -W - 30, eave).color(trim));

// ---- Three service doors with louvred intakes, hinges and latches ----
for (const [x0, x1] of [[-1560, -620], [-480, 460], [600, 1540]]) {
  const xm = (x0 + x1) / 2;
  add(`door-${x0}`, blk(x0, -W - 14, tankTop + 120, x1, -W, eave - 120).color(canopy));
  for (const xs of [x0 - 10, x1]) {
    add(`door-seam-${x0}-${xs}`, blk(xs, -W - 18, tankTop + 110, xs + 10, -W, eave - 110).color(trim));
  }
  add(`door-seam-top-${x0}`, blk(x0, -W - 18, eave - 120, x1, -W, eave - 110).color(trim));
  add(`louvre-frame-${x0}`, blk(x0 + 110, -W - 24, 1080, x1 - 110, -W - 14, 1800).color(trim));
  for (let i = 0; i < 9; i++) {
    add(`louvre-${x0}-${i}`, blk(-(x1 - x0 - 260) / 2, -40, -9, (x1 - x0 - 260) / 2, 40, 9).rotateX(-35).translate(xm, -W - 40, 1120 + 76 * i).color(canopy));
  }
  for (const z of [tankTop + 300, eave - 300]) {
    add(`hinge-${x0}-${z}`, alongX(rod(18, -60, 60)).rotateZ(90).translate(x0 + 20, -W - 24, z).color(trim));
  }
  add(`latch-${x0}`, blk(x1 - 90, -W - 50, 1250, x1 - 60, -W - 14, 1460).color(trim));
  add(`latch-lock-${x0}`, facingFront(rod(18, 0, 20)).translate(x1 - 75, -W - 50, 1480).color(exhaust));
}

// ---- Radiator discharge hood at +X, turned up to throw air skywards ----
add('discharge-hood', prismX([[-W + 60, 600], [W - 60, 600], [W - 60, 1950], [-W + 60, 1950]], L, L + 120).color(canopy));
add('hood-floor', blk(L + 120, -590, 600, L + 500, 590, 640).color(canopy));
add('hood-outer-wall', blk(L + 460, -590, 640, L + 500, 590, 1920).color(canopy));
for (const y of [-570, 570]) {
  add(`hood-side-${y}`, blk(L + 120, y - 20, 640, L + 500, y + 20, 1920).color(canopy));
}
add('hood-grille', blk(L + 120, -550, 1900, L + 460, 550, 1912).color(trim));
for (let i = 0; i < 6; i++) {
  add(`hood-vane-${i}`, blk(-12, -560, -60, 12, 560, 60).rotateY(20).translate(L + 180 + 50 * i, 0, 1870).color(trim));
}

// ---- Control end (-X): viewing window, E-stop, cable gland box ----
add('control-window-frame', blk(-L - 20, -380, 1200, -L, 380, 1750).color(trim));
add('control-window', blk(-L - 26, -330, 1250, -L - 20, 330, 1700).color(windowGlass));
add('estop-housing', blk(-L - 60, 440, 1420, -L, 560, 1560).color(estopYellow));
add('estop-button', outOfEnd(turned([[0, 0], [45, 0], [45, 20], [35, 40], [0, 40]])).translate(-L - 60, 500, 1490).color(accent));
add('gland-box', blk(-L - 120, -500, tankTop + 80, -L, 200, tankTop + 360).color(trim));
add('intake-louvre-end', blk(-L - 12, -500, 1830, -L, 500, 1990).color(trim));

// ---- Roof exhaust: saddles, silencer, flex joint, rain-capped tailpipe ----
const sz = ridge + 160;
for (const x of [-900, 300]) {
  add(`silencer-saddle-${x}`, blk(x - 40, -230, ridge - 60, x + 40, 230, sz - 120).color(trim));
}
add('silencer', alongX(turned([[0, -1300], [190, -1300], [230, -1240], [230, 560], [190, 620], [0, 620]])).translate(0, 0, sz + 60).color(exhaust));
for (const x of [-1100, 400]) {
  add(`silencer-band-${x}`, alongX(ring(230, 245, 0, 40)).translate(x, 0, sz + 60).color(trim));
}
add('flex-joint', alongX(turned([[0, -1420], [90, -1420], [100, -1400], [90, -1380], [100, -1360], [90, -1340], [0, -1340]])).translate(0, 0, sz + 60).color(trim));
add('exhaust-inlet', rod(80, ridge - 40, sz + 140).translate(-1440, 0, 0).color(exhaust));
add('tailpipe-elbow', alongX(rod(80, 620, 760)).translate(0, 0, sz + 60).color(exhaust));
add('tailpipe', rod(80, sz + 60, sz + 700).translate(760, 0, 0).color(exhaust));
add('rain-cap', blk(-110, -110, -6, 110, 110, 6).rotateY(-25).translate(760, 0, sz + 720).color(trim));
add('rain-cap-hinge', blk(650, -30, sz + 660, 690, 30, sz + 720).color(trim));

// ---- Lifting eyes at the roof corners ----
for (const x of [-L + 120, L - 120]) {
  for (const y of [-W + 120, W - 120]) {
    add(`lifting-eye-${x}-${y}`, facingFront(ring(45, 70, -15, 15)).translate(x, y, eave + 100).color(exhaust));
  }
}

return p.model();
