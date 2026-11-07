// SPDX-License-Identifier: CC0-1.0
// Station breathing-air compressor: the skid-mounted high-pressure compressor
// that refills SCBA cylinders in the station's fill room. What makes it one:
// a three-stage compressor block with finned cylinders splayed in a W above
// the crankcase, a big cooling-fan flywheel behind a mesh guard driven by a
// belt from a finned electric motor, the purification tower of filter
// cartridges that scrubs the air to breathing grade, the condensate drain
// manifold, and an upright control panel with stage gauges, hour meter and
// start/stop buttons. Millimetres, Z up, base origin, the skid runs along X
// and the raised control panel at the back faces -Y.
meta({
  name: "station-air-compressor",
  license: 'CC0-1.0',
  title: "Station breathing-air compressor",
  description: "Skid-mounted three-stage breathing-air compressor: finned cylinders in a W over the crankcase, guarded cooling-fan flywheel with belt guard, finned electric motor with terminal box, two-cartridge purification tower, condensate drain manifold and an upright control panel with stage gauges, hour meter and start/stop buttons. Material controls: frame paint, compressor block, motor paint, filter housings and gauges; apparatus-red, clean-zone and weathered presets.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "CC0", "breathing-air", "compressor", "scba", "fill station", "high pressure"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 9000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const frame = param('frame', '#2f3438', { label: 'Skid frame and panel enclosure' });
const block = param('block', '#9aa2a8', { label: 'Compressor block and fins' });
const motor = param('motor', '#2f6fa8', { label: 'Electric motor and fan guard' });
const filters = param('filters', '#d9dcdc', { label: 'Filter housings and gauges' });

presets({
  'apparatus-red': { frame: '#9e2a22', motor: '#2d3236' },
  'clean-zone': { frame: '#e4e6e2', motor: '#3f8c86', filters: '#f2f2ee' },
  weathered: { frame: '#3c3a36', block: '#7f7a70', motor: '#40596b', filters: '#bdb8aa' },
});

const p = assembly("station-air-compressor");
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
// Turned parts with the axis along +X, and facing out of the -Y front.
const alongX = (shape) => shape.rotateY(90);
const facingFront = (shape) => shape.rotateX(90);

// Fixed trade colours: green start, red stop, gauge faces white.
const startGreen = '#2f9e44', stopRed = '#c92a2a', dial = '#f4f4f0';

// ---- Skid: two channel rails, cross members and a deck plate ----
for (const y of [-380, 380]) {
  add(`skid-rail-${y}`, prismX([[y - 40, 0], [y + 40, 0], [y + 40, 20], [y - 30, 20], [y - 30, 100], [y + 40, 100], [y + 40, 120], [y - 40, 120]], -720, 720).color(frame));
}
for (const x of [-640, 0, 640]) add(`skid-cross-${x}`, blk(x - 40, -340, 20, x + 40, 340, 100).color(frame));
add('deck', blk(-700, -400, 120, 700, 400, 135).color(frame));
for (const x of [-700, 700]) {
  for (const y of [-300, 300]) add(`lift-eye-${x}-${y}`, alongX(ring(20, 40, -10, 10)).rotateZ(90).translate(x + Math.sign(x) * 20, y, 90).color(frame));
}

// ---- Electric motor: finned frame along X, end bells, feet, terminal box ----
const mz = 360, my = 180;
for (const x of [-560, -280]) add(`motor-foot-${x}`, blk(x - 50, my - 150, 135, x + 50, my + 150, 220).color(motor));
add('motor-frame', alongX(turned([[0, -620], [140, -620], [165, -590], [165, -230], [140, -200], [0, -200]])).translate(0, my, mz).color(motor));
for (let i = 0; i < 8; i++) add(`motor-fin-${i}`, alongX(ring(165, 182, -580 + 46 * i, -560 + 46 * i)).translate(0, my, mz).color(motor));
add('motor-fan-cowl', alongX(turned([[0, -720], [120, -720], [160, -680], [160, -620], [0, -620]])).translate(0, my, mz).color(motor));
add('motor-terminal-box', blk(-480, my - 70, mz + 150, -340, my + 70, mz + 250).color(motor));
add('motor-shaft', alongX(rod(25, -200, 400)).translate(0, my, mz).color(block));

// ---- Compressor block: crankcase with three finned stages in a W ----
const cz = 520;
add('crankcase', blk(-120, -330, 135, 360, 40, 470).color(block));
add('crankcase-cover', prismX([[-330, 470], [40, 470], [-20, 560], [-270, 560]], -120, 360).color(block));
add('oil-sight-glass', facingFront(ring(0, 30, 0, 8)).translate(320, -330, 260).color(filters));
const stage = (name, r, h, x, tilt) => {
  // Cylinder barrel with cooling fins and a head, built along Z then tilted about X.
  const parts = [rod(r * 0.8, 0, h).color(block)];
  for (let i = 0; i < Math.floor(h / 34); i++) parts.push(ring(r * 0.8, r * 1.35, 20 + 34 * i, 32 + 34 * i).color(block));
  parts.push(turned([[0, h], [r * 1.25, h], [r * 1.25, h + 50], [r * 0.9, h + 80], [0, h + 80]]).color(block));
  parts.forEach((part, i) => add(`${name}-${i}`, part.rotateX(tilt).translate(x, -145, cz)));
};
stage('stage-1', 95, 260, 60, -42);
stage('stage-2', 70, 250, 160, 0);
stage('stage-3', 45, 240, 280, 42);
// Interstage cooler line from the first to the second stage head.
add('intercooler', blk(-20, -160, 870, 170, -130, 890).color(block));

// ---- Belt guard over both pulleys, cooling-fan flywheel behind a mesh guard ----
add('belt-guard', prismX([[-355, 520], [-290, 370], [-145, 300], [180, 200], [300, 260], [340, 360], [300, 460], [180, 520], [-145, 740], [-290, 670]], 380, 430).color(motor));
const fx = 440;
add('fan-shaft', alongX(rod(30, 430, fx)).translate(0, -145, cz).color(block));
add('flywheel', alongX(turned([[0, fx], [250, fx], [250, fx + 45], [0, fx + 45]])).translate(0, -145, cz).color(block));
for (let i = 0; i < 6; i++) add(`fan-blade-${i}`, blk(fx + 45, -20, 70, fx + 70, 20, 240).rotateX(60 * i + 15).translate(0, -145, cz).color(block));
add('fan-guard-ring', alongX(ring(255, 285, fx + 70, fx + 130)).translate(0, -145, cz).color(motor));
for (let i = 0; i < 6; i++) add(`fan-guard-spoke-${i}`, blk(fx + 115, -12, -270, fx + 128, 12, 270).rotateX(30 * i).translate(0, -145, cz).color(motor));
add('fan-guard-hub', alongX(rod(60, fx + 110, fx + 135)).translate(0, -145, cz).color(motor));

// ---- Purification tower: two cartridge housings on a manifold block ----
const tx = -560, ty = -250;
add('filter-manifold', blk(tx - 130, ty - 70, 135, tx + 130, ty + 70, 260).color(filters));
for (const dx of [-70, 70]) {
  add(`filter-housing-${dx}`, turned([[0, 260], [62, 260], [62, 980], [50, 1010], [0, 1010]]).translate(tx + dx, ty, 0).color(filters));
  add(`filter-cap-${dx}`, turned([[0, 1010], [56, 1010], [56, 1050], [0, 1050]]).translate(tx + dx, ty, 0).color(frame));
  add(`filter-band-${dx}`, ring(62, 70, 600, 630).translate(tx + dx, ty, 0).color(frame));
}
add('filter-bracket', blk(tx - 150, ty + 60, 135, tx + 150, ty + 90, 900).color(frame));
add('filter-feed', alongX(rod(16, tx + 130, 60)).translate(0, ty + 30, 230).color(block));

// ---- Condensate drain manifold with three solenoid valves ----
add('drain-manifold', alongX(rod(18, -300, 40)).translate(0, -360, 190).color(block));
for (const x of [-250, -130, -10]) add(`drain-valve-${x}`, blk(x - 30, -390, 200, x + 30, -330, 280).color(frame));

// ---- Upright control panel with gauges, hour meter and buttons ----
const px = -330, py = 380;
for (const x of [px - 200, px + 200]) add(`panel-post-${x}`, blk(x - 25, py + 30, 135, x + 25, py + 80, 1000).color(frame));
add('control-panel', blk(px - 240, py, 1000, px + 240, py + 140, 1400).color(frame));
add('panel-hood', prismX([[py - 40, 1400], [py + 140, 1400], [py + 140, 1430], [py - 40, 1420]], px - 250, px + 250).color(frame));
[-150, -50, 50, 150].forEach((dx, i) => {
  add(`gauge-bezel-${i}`, facingFront(ring(0, 42, 0, 20)).translate(px + dx, py, 1290).color(filters));
  add(`gauge-dial-${i}`, facingFront(rod(36, 20, 23)).translate(px + dx, py, 1290).color(dial));
});
add('hour-meter', blk(px - 190, py - 12, 1120, px - 60, py, 1190).color(dial));
add('start-button', facingFront(turned([[0, 0], [28, 0], [28, 18], [22, 26], [0, 26]])).translate(px + 70, py, 1150).color(startGreen));
add('stop-button', facingFront(turned([[0, 0], [34, 0], [34, 18], [28, 30], [0, 30]])).translate(px + 160, py, 1150).color(stopRed));
add('panel-conduit', rod(20, 360, 1000).translate(px + 200, py + 100, 0).color(frame));

return p.model();
