// SPDX-License-Identifier: CC0-1.0
// Clean-agent cylinder bank: the gaseous fire-suppression supply for a data
// hall. What makes it one: a row of tall seamless agent cylinders with domed
// shoulders and necks, each crowned by a brass discharge valve with a pressure
// gauge and a flexible discharge hose up to a common black-steel manifold; the
// master cylinder carries the red solenoid actuator; the row is held to a
// galvanised strut rack by two straps per cylinder and stands on a floor rail.
// Millimetres, Z up, the gauges and labels face -Y.
meta({
  name: "clean-agent-cylinder-bank",
  license: 'CC0-1.0',
  title: "Clean-agent cylinder bank",
  description: "Five-cylinder clean-agent suppression bank: turned agent cylinders with domed shoulders, brass discharge valves with gauges, flexible discharge hoses and check valves on a black-steel manifold with end cap and discharge riser, solenoid actuator on the master cylinder, white hazard labels, two straps per cylinder on a galvanised strut rack and floor rail. Material controls: cylinder paint, valve brass, rack steel, manifold pipe and labels; inertGas, nitrogen and weathered presets.",
  tags: ['data center', 'fire suppression', 'clean agent', 'gas cylinder', 'manifold', 'critical infrastructure', 'safety', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 9000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cylinderPaint = param('cylinderPaint', '#c42a22', { label: 'Cylinder paint' });
const valveBrass = param('valveBrass', '#c9a24a', { label: 'Valves and gauges (brass)' });
const rackSteel = param('rackSteel', '#a9b1b4', { label: 'Strut rack and straps (galvanised)' });
const pipe = param('pipe', '#34383b', { label: 'Manifold and hoses' });
const label = param('label', '#f1efe6', { label: 'Hazard labels' });

presets({
  inertGas: { cylinderPaint: '#8e979b', valveBrass: '#b9b3a2', label: '#2f8a4a' },
  nitrogen: { cylinderPaint: '#2c2f33', valveBrass: '#c4a256', label: '#e9e6dc' },
  weathered: { cylinderPaint: '#9a3a31', valveBrass: '#9b8250', rackSteel: '#8b8f8c', pipe: '#3d3a36', label: '#d8d2c0' },
});

const p = assembly("clean-agent-cylinder-bank");
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
// Turned part whose axis points at -Y (gauge faces, valve outlets).
const facingFront = (shape) => shape.rotateX(90);
// Turned part whose axis runs along +X (manifold pipe).
const alongX = (shape) => shape.rotateY(90);

const xs = [-720, -360, 0, 360, 720];
const R = 140;

// ---- Floor rail and galvanised strut rack behind the cylinders ----
add('floor-rail', blk(-950, -190, 0, 950, 190, 40).color(rackSteel));
add('floor-rail-lip', blk(-950, 150, 40, 950, 190, 90).color(rackSteel));
for (const x of [-930, 930]) {
  add(`rack-upright-${x}`, blk(x - 21, 160, 40, x + 21, 202, 1700).color(rackSteel));
}
for (const z of [420, 1000]) {
  add(`rack-channel-${z}`, blk(-950, 160, z, 950, 202, z + 42).color(rackSteel));
}

// ---- Agent cylinders: domed shoulder, neck, two straps, front label ----
xs.forEach((x, i) => {
  add(`cylinder-${i}`, turned([[0, 40], [128, 40], [R, 70], [R, 1080], [128, 1150], [96, 1200], [52, 1228], [44, 1260], [0, 1260]]).translate(x, 0, 0).color(cylinderPaint));
  add(`foot-ring-${i}`, ring(118, 142, 40, 80).translate(x, 0, 0).color(pipe));
  for (const z of [420, 1000]) {
    add(`strap-${i}-${z}`, ring(R, R + 8, z, z + 42).translate(x, 0, 0).color(rackSteel));
    add(`strap-bolt-${i}-${z}`, blk(x - 16, R, z + 4, x + 16, 165, z + 38).color(rackSteel));
  }
  add(`label-${i}`, blk(x - 70, -R - 4, 560, x + 70, -R + 6, 860).color(label));
  add(`label-band-${i}`, blk(x - 70, -R - 5, 690, x + 70, -R + 5, 730).color(cylinderPaint));

  // Discharge valve: brass body on the neck, gauge facing front, outlet up.
  add(`valve-body-${i}`, turned([[0, 1260], [58, 1260], [58, 1330], [42, 1350], [42, 1380], [0, 1380]]).translate(x, 0, 0).color(valveBrass));
  add(`gauge-${i}`, facingFront(turned([[0, 0], [36, 0], [36, 18], [30, 24], [0, 24]])).translate(x, -56, 1305).color(valveBrass));
  add(`gauge-face-${i}`, facingFront(rod(28, 24, 27)).translate(x, -56, 1305).color(label));
  add(`check-valve-${i}`, rod(30, 1380, 1440).translate(x, 0, 0).color(valveBrass));
  add(`hose-${i}`, rod(19, 1440, 1560).translate(x, 0, 0).color(pipe));
  add(`hose-ferrule-${i}`, ring(17, 25, 1545, 1575).translate(x, 0, 0).color(valveBrass));
});

// Master cylinder: solenoid actuator on the valve, with a pilot line.
add('actuator-body', blk(-720 - 55, -135, 1330, -720 + 55, -55, 1420).color(cylinderPaint));
add('actuator-cap', facingFront(rod(30, 0, 22)).translate(-720, -135, 1375).color(label));
add('actuator-conduit', alongX(rod(10, 0, 220)).translate(-720 - 260, -95, 1405).color(rackSteel));

// ---- Common discharge manifold with end cap, tees and riser ----
add('manifold', alongX(rod(50, -860, 880)).translate(0, 0, 1615).color(pipe));
add('manifold-cap', alongX(turned([[0, 0], [56, 0], [56, 40], [30, 70], [0, 70]])).translate(-930, 0, 1615).color(pipe));
for (const x of xs) {
  add(`manifold-tee-${x}`, rod(58, 1565, 1665).translate(x, 0, 0).color(pipe));
}
add('riser-elbow', turned([[0, 0], [62, 0], [62, 120], [0, 120]]).translate(880, 0, 1560).color(pipe));
add('riser', rod(50, 1680, 2050).translate(880, 0, 0).color(pipe));
add('riser-flange', ring(0, 92, 2050, 2080).translate(880, 0, 0).color(rackSteel));
add('manifold-hanger-left', blk(-640, 160, 1560, -600, 202, 1700).color(rackSteel));
add('manifold-hanger-right', blk(600, 160, 1560, 640, 202, 1700).color(rackSteel));
add('manifold-clamp-left', ring(50, 60, -20, 20).rotateY(90).translate(-620, 0, 1615).color(rackSteel));
add('manifold-clamp-right', ring(50, 60, -20, 20).rotateY(90).translate(620, 0, 1615).color(rackSteel));
add('manifold-saddle-left', blk(-640, 40, 1600, -600, 165, 1630).color(rackSteel));
add('manifold-saddle-right', blk(600, 40, 1600, 640, 165, 1630).color(rackSteel));

return p.model();
