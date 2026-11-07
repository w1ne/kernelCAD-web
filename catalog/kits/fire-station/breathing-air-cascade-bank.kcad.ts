// SPDX-License-Identifier: CC0-1.0
// Breathing air cascade bank: the rack of tall high-pressure storage
// cylinders that a station's compressor charges so SCBA bottles can be
// topped up in seconds. What makes it one: four tall, domed cylinders
// standing in a welded rack, each held by two hinged restraint straps and
// wearing a painted breathing-air shoulder band, a cylinder valve with a
// handwheel on every neck, coiled high-pressure pigtails running to a
// common header, and a front fill panel with a pressure gauge and isolation
// valve per cylinder. Millimetres, Z up, base origin, the cylinders stand in
// a row along X and the fill panel faces -Y.
meta({
  name: "breathing-air-cascade-bank",
  license: 'CC0-1.0',
  title: "Breathing air cascade bank",
  description: "Four-cylinder breathing-air cascade storage bank: tall domed high-pressure cylinders with painted breathing-air shoulder bands, a welded rack with base pan, uprights and hinged restraint straps, a valve and handwheel on every cylinder neck, high-pressure pigtails to a common header, and a front fill panel with one gauge and isolation valve per cylinder. Material controls: cylinder body, shoulder band, rack paint and brass valves; apparatus-red, clean-zone and weathered presets.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "CC0", "breathing", "air", "cascade", "bank", "scba", "high pressure", "cylinder"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 9000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const cylinder = param('cylinder', '#d9dcdc', { label: 'Cylinder body' });
const shoulder = param('shoulder', '#2f8a4e', { label: 'Breathing-air shoulder band' });
const rack = param('rack', '#b83d34', { label: 'Rack, straps and fill panel' });
const brass = param('brass', '#c9a54a', { label: 'Valves, fittings and pigtails' });

presets({
  'apparatus-red': { rack: '#b83d34' },
  'clean-zone': { rack: '#4e8c87', cylinder: '#eef0ee', shoulder: '#f2f2ee' },
  'eu-marking': { shoulder: '#f2f2ee', cylinder: '#2a2c2e', rack: '#3f4a50' },
  weathered: { cylinder: '#a9aaa4', shoulder: '#4c6b55', rack: '#7d3a33', brass: '#9c8448' },
});

const p = assembly("breathing-air-cascade-bank");
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
// Turned parts with the axis along +X, and facing out of the -Y front.
const alongX = (shape) => shape.rotateY(90);
const facingFront = (shape) => shape.rotateX(90);

// Fixed trade colours: gauge face white and the black handwheels and caps.
const dial = '#f4f4f0', black = '#22262a';

const R = 140, base = 90, neck = 1720; // cylinder radius, foot, shoulder top
const xs = [-480, -160, 160, 480];
const rackY = 0;

// ---- Rack: base pan, corner uprights, back spine and top rail ----
add('base-pan', blk(-680, -220, 0, 680, 220, base).color(rack));
add('pan-lip', blk(-680, -230, base, 680, -210, base + 60).color(rack));
for (const x of [-660, 660]) {
  for (const y of [-200, 200]) add(`upright-${x}-${y}`, blk(x - 20, y - 20, base, x + 20, y + 20, 1800).color(rack));
  add(`side-brace-${x}`, blk(x - 15, -200, 900, x + 15, 200, 940).color(rack));
}
add('back-spine', blk(-680, 180, 1760, 680, 220, 1820).color(rack));
add('front-rail', blk(-680, -220, 1760, 680, -180, 1800).color(rack));

// ---- Cylinders: domed body, shoulder band, neck, valve, handwheel ----
xs.forEach((x, i) => {
  add(`cylinder-${i}`, turned([[0, base], [R - 30, base], [R, base + 40], [R, neck - 120], [R - 20, neck - 50], [R - 60, neck - 10], [40, neck], [0, neck]]).translate(x, rackY, 0).color(cylinder));
  add(`shoulder-${i}`, turned([[R - 1, neck - 260], [R + 3, neck - 260], [R + 3, neck - 120], [R - 17, neck - 48], [R - 21, neck - 48]]).translate(x, rackY, 0).color(shoulder));
  add(`neck-${i}`, rod(36, neck, neck + 50).translate(x, rackY, 0).color(brass));
  add(`valve-${i}`, blk(x - 45, rackY - 35, neck + 50, x + 45, rackY + 35, neck + 150).color(brass));
  add(`valve-stem-${i}`, rod(10, neck + 150, neck + 190).translate(x, rackY, 0).color(brass));
  add(`handwheel-${i}`, ring(30, 55, neck + 190, neck + 210).translate(x, rackY, 0).color(black));
  add(`outlet-${i}`, facingFront(rod(16, 35, 80)).translate(x, rackY, neck + 100).color(brass));
  // Two hinged restraint straps around each cylinder.
  for (const z of [520, 1300]) add(`strap-${i}-${z}`, ring(R + 2, R + 14, z, z + 50).translate(x, rackY, 0).color(rack));
});
for (const z of [520, 1300]) add(`strap-bar-${z}`, blk(-680, R - 10, z, 680, R + 30, z + 50).color(rack));

// ---- Pigtails down to the common header and the front fill panel ----
const hz = 1450, panelY = -260;
add('header', alongX(rod(22, -560, 560)).translate(0, panelY + 60, hz).color(brass));
xs.forEach((x, i) => {
  add(`pigtail-drop-${i}`, rod(10, hz, neck + 100).translate(x, rackY - 80, 0).color(brass));
  add(`pigtail-run-${i}`, facingFront(rod(10, 0, 140)).translate(x, rackY - 80 + 0, hz).color(brass));
});
add('fill-panel', blk(-600, panelY, 1050, 600, panelY + 30, 1420).color(rack));
for (const x of [-600, 600]) add(`panel-bracket-${x}`, blk(x - 15, panelY + 30, 1050, x + 15, -200, 1420).color(rack));
xs.forEach((x, i) => {
  add(`gauge-bezel-${i}`, facingFront(ring(0, 60, 0, 25)).translate(x, panelY, 1300).color(cylinder));
  add(`gauge-dial-${i}`, facingFront(rod(52, 25, 28)).translate(x, panelY, 1300).color(dial));
  add(`gauge-needle-${i}`, blk(-4, -2, 0, 4, 2, 44).rotateY(-50 + 30 * i).translate(x, panelY - 30, 1300).color(black));
  add(`iso-valve-${i}`, facingFront(rod(28, 0, 60)).translate(x, panelY, 1140).color(brass));
  add(`iso-handle-${i}`, blk(x - 70, panelY - 75, 1130, x + 70, panelY - 60, 1150).color(black));
});
add('fill-outlet', facingFront(turned([[0, 0], [40, 0], [40, 40], [25, 60], [25, 120], [0, 120]])).translate(0, panelY, 1080).color(brass));

return p.model();
