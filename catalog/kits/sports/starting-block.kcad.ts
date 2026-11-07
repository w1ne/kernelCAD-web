// SPDX-License-Identifier: CC0-1.0
// Track starting block: what makes it one is a long aluminium centre rail
// pinned into the track by steel spikes, carrying two independently clamped
// foot pedals — a lower-angled front pedal and a steeper rear pedal, each a
// rubber-faced plate braced by triangular side cheeks — with a notched
// adjustment rack along the rail and a carry bar across the front.
// Generic visualization geometry at about real size (about 0.8 m long,
// pedals 120 mm wide), millimetres, Z up, the athlete faces -X (towards the
// start line), spike tips on z = 0.
meta({
  name: 'starting-block',
  license: 'CC0-1.0',
  title: 'Track starting block',
  description: "Track starting block: anodised aluminium centre rail with a notched adjustment rack, track spikes in carrier blocks underneath, a front and a steeper rear pedal on clamp carriages, each with rubber face pads, triangular side cheeks and a release lever, and a front carry bar. Material controls: anodized aluminium, pedal frame, pedal rubber, spike steel; clubColors, competitionBlue and weathered presets.",
  tags: ['starting block', 'starting blocks', 'sprint', 'track', 'athletics', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const anodizedAluminium = param('anodizedAluminium', '#b3bdc1', { label: 'Anodized aluminium rail' });
const pedalFrame = param('pedalFrame', '#c8392f', { label: 'Pedal frame (powder coat)' });
const pedalRubber = param('pedalRubber', '#2b3034', { label: 'Pedal rubber' });
const spikeSteel = param('spikeSteel', '#6c757a', { label: 'Spike and rack steel' });
presets({
  clubColors: { anodizedAluminium: '#8b989b', pedalRubber: '#ba4d3f', pedalFrame: '#3a4248' },
  competitionBlue: { anodizedAluminium: '#c7cfd2', pedalFrame: '#2a5fa6', pedalRubber: '#1f2326' },
  weathered: { anodizedAluminium: '#8d9293', pedalFrame: '#8d5248', pedalRubber: '#45474a', spikeSteel: '#6d6158' },
});

const p = assembly('starting-block');
const parts = [];
const add = (name, shape) => parts.push([name, shape]);

// Cross-section [[y, z], ...] extruded along +X from x = 0.
const alongX = (pts, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90);
// Side profile [[x, z], ...] extruded across Y, placed with its near face at y.
const sideXZ = (pts, t, y) => extrudePolygon(pts, t).rotateX(90).translate(0, y + t, 0);
// Cylinder lying across the block (axis Y), centred on y = 0.
const acrossY = (r, len, n = 12) => cylinder(len, r, n).rotateX(90).translate(0, len / 2, 0);

const RAIL_LEN = 800;
const RAIL_H = 46;

// Centre rail: flanged base with a raised spine on top.
add('rail', alongX([
  [-60, 0], [60, 0], [60, 8], [24, 12], [22, RAIL_H], [-22, RAIL_H], [-24, 12], [-60, 8],
], RAIL_LEN).color(anodizedAluminium));
add('front-end-cap', box(14, 124, 14, true).translate(7, 0, 7).color(pedalRubber));
add('rear-end-cap', box(14, 124, 14, true).translate(RAIL_LEN - 7, 0, 7).color(pedalRubber));
// Adjustment rack: steel teeth along the spine every 25 mm.
for (let i = 0; i < 24; i++) {
  add(`rack-tooth-${i + 1}`, box(10, 30, 6, true).translate(110 + i * 25, 0, RAIL_H + 3).color(spikeSteel));
}
// Track spikes under the rail, each screwed into a steel carrier block.
const spike = path().moveTo(0, 0).lineTo(5, 0).lineTo(5, 4).lineTo(0, 14).close().revolve();
for (const [i, x] of [60, 400, 740].entries()) {
  for (const s of [-1, 1]) {
    add(`spike-carrier-${i + 1}-${s < 0 ? 'l' : 'r'}`, box(30, 26, 8, true).translate(x, s * 45, -4).color(spikeSteel));
    add(`spike-${i + 1}-${s < 0 ? 'l' : 'r'}`, spike.rotateX(180).translate(x, s * 45, -8).color(spikeSteel));
  }
}
// Carry bar across the front with rubber grips.
add('carry-bar', acrossY(12, 300).translate(36, 0, 26).color(anodizedAluminium));
for (const s of [-1, 1]) add(`carry-grip-${s < 0 ? 'l' : 'r'}`, acrossY(16, 70).translate(36, s * 115, 26).color(pedalRubber));

// Pedal: clamp carriage on the rail, a face plate inclined at `deg`, side cheeks
// bracing it, a rubber face pad with ribs, and a release lever on the carriage.
const pedal = (name, x0, deg, len) => {
  const a = (deg * Math.PI) / 180;
  const z0 = RAIL_H + 14;
  const top = [x0 + len * Math.cos(a), z0 + len * Math.sin(a)];
  add(`${name}-carriage`, box(130, 80, 26, true).translate(x0 + 60, 0, RAIL_H + 1).color(pedalFrame));
  add(`${name}-plate`, box(len, 130, 8, true).translate(len / 2, 0, 4).rotateY(-deg).translate(x0, 0, z0).color(pedalFrame));
  add(`${name}-pad`, box(len - 20, 116, 10, true).translate(len / 2, 0, 13).rotateY(-deg).translate(x0, 0, z0).color(pedalRubber));
  for (let k = 0; k < 5; k++) {
    add(`${name}-rib-${k + 1}`, box(6, 110, 5, true).translate(20 + k * ((len - 40) / 4), 0, 20).rotateY(-deg).translate(x0, 0, z0).color(pedalRubber));
  }
  for (const s of [-1, 1]) {
    add(`${name}-cheek-${s < 0 ? 'l' : 'r'}`, sideXZ([
      [x0 - 6, z0 - 20], [top[0] + 4, top[1] - 4], [top[0] + 14, z0 - 20],
    ], 8, s < 0 ? -73 : 65).color(pedalFrame));
  }
  add(`${name}-lever`, sideXZ([[x0 + 110, RAIL_H + 10], [x0 + 190, RAIL_H + 34], [x0 + 192, RAIL_H + 24], [x0 + 118, RAIL_H]], 10, -55).color(spikeSteel));
  add(`${name}-lever-knob`, acrossY(9, 24).translate(x0 + 190, -60, RAIL_H + 30).color(pedalRubber));
};
pedal('front-pedal', 150, 45, 190);
pedal('rear-pedal', 470, 62, 200);

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
