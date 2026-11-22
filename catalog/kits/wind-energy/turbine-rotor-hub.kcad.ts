// SPDX-License-Identifier: CC0-1.0
// Turbine rotor hub: the cast-iron hub of a three-blade wind turbine, shown
// bare (spinner removed) on its shop cradle. What makes it one: a rounded,
// egg-like casting on the rotor axis with three radial blade bosses at 120
// degrees, each carrying a two-ring pitch bearing with a ring of blade studs
// and a pitch-drive motor; a bolted main-shaft flange and shaft stub at the
// rear and the spinner mounting ring at the nose.
// Stylized at the wind-energy kit's reduced scene scale, millimetres, Z up,
// rotor axis along Y with the nose towards -Y.
meta({
  name: "turbine-rotor-hub",
  license: 'CC0-1.0',
  title: "Turbine rotor hub",
  description: "Bare three-blade rotor hub on a shop cradle: turned cast-iron hub body, three radial blade bosses with two-ring pitch bearings, blade studs and pitch-drive motors, rear main-shaft flange with bolts and shaft stub, nose spinner ring, steel cradle with timber pads. Material controls: hub casting paint, bearing steel, fasteners, cradle paint and timber; weathered, highVisibility and primer presets.",
  tags: ['wind', 'wind turbine', 'rotor hub', 'hub', 'pitch bearing', 'casting', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 6000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const casting = param('casting', '#d3d8d2', { label: 'Hub casting paint' });
const bearingSteel = param('bearingSteel', '#5f696e', { label: 'Pitch bearing and shaft steel' });
const fasteners = param('fasteners', '#b7bcbd', { label: 'Studs and bolts (zinc)' });
const cradlePaint = param('cradlePaint', '#2f6fb0', { label: 'Cradle paint' });
const timber = param('timber', '#a77c4f', { label: 'Cradle timber pads' });

presets({
  weathered: { casting: '#b9bcb3', bearingSteel: '#6a645c', fasteners: '#8d8d86', cradlePaint: '#3d5c78', timber: '#7f664c' },
  highVisibility: { casting: '#f3f4f0', bearingSteel: '#3c464b', fasteners: '#d8dcdc', cradlePaint: '#f0b81c', timber: '#b88d5a' },
  primer: { casting: '#8a6e5c', bearingSteel: '#55606a' },
});

const p = assembly("turbine-rotor-hub");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const ring = (r0, r1, z0, z1) => turned([[r0, z0], [r1, z0], [r1, z1], [r0, z1]]);
const rect = (x0, y0, x1, y1, h) => extrudePolygon([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], h);

const hubZ = 600;
// Profile about the rotor axis: z runs forward, then rotateX(90) points it at -Y.
const onAxis = (shape) => shape.rotateX(90).translate(0, 0, hubZ);
// Radial feature built along +Z, swung round the rotor axis to blade angle a.
const onArm = (shape, a) => shape.rotateY(a).translate(0, 0, hubZ);

// ---- Hub body, shaft flange and nose ring ----
add('hub-body', onAxis(turned([[0, -220], [195, -220], [240, -150], [258, -40], [250, 70], [205, 165], [130, 230], [0, 245]])).color(casting));
add('shaft-flange', onAxis(ring(0, 215, -262, -220)).color(bearingSteel));
add('main-shaft', onAxis(turned([[0, -430], [118, -430], [118, -262], [0, -262]])).color(bearingSteel));
for (let i = 0; i < 16; i++) {
  const a = (2 * Math.PI * i) / 16;
  add(`shaft-bolt-${i}`, onAxis(turned([[0, 0], [9, 0], [9, 18], [0, 18]])).translate(185 * Math.cos(a), 280, 185 * Math.sin(a)).color(fasteners));
}
add('spinner-ring', onAxis(ring(70, 120, 238, 262)).color(bearingSteel));
add('nose-hatch', onAxis(turned([[0, 244], [68, 244], [60, 258], [0, 258]])).color(casting));

// ---- Three blade bosses with pitch bearings, studs and pitch drives ----
for (const a of [0, 120, 240]) {
  add(`boss-${a}`, onArm(turned([[0, 140], [168, 140], [172, 300], [0, 300]]), a).color(casting));
  add(`bearing-outer-${a}`, onArm(ring(140, 190, 300, 338), a).color(bearingSteel));
  add(`bearing-inner-${a}`, onArm(ring(98, 140, 300, 356), a).color(fasteners));
  add(`bearing-bore-${a}`, onArm(ring(0, 98, 300, 312), a).color(bearingSteel));
  for (let i = 0; i < 12; i++) {
    const t = (2 * Math.PI * i) / 12;
    add(`stud-${a}-${i}`, onArm(turned([[0, 0], [6, 0], [6, 50], [0, 50]]).translate(119 * Math.cos(t), 119 * Math.sin(t), 356), a).color(fasteners));
  }
  // Pitch drive: motor and gearbox behind the boss, pinion up into the bearing.
  add(`pitch-gearbox-${a}`, onArm(turned([[0, 200], [48, 200], [48, 300], [0, 300]]).translate(0, 205, 0), a).color(bearingSteel));
  add(`pitch-motor-${a}`, onArm(turned([[0, 120], [40, 120], [40, 200], [0, 200]]).translate(0, 205, 0), a).color(casting));
  add(`pitch-motor-cap-${a}`, onArm(turned([[0, 100], [30, 100], [30, 120], [0, 120]]).translate(0, 205, 0), a).color(bearingSteel));
}

// ---- Shop cradle: steel base frame, posts and timber pads under the body ----
add('cradle-rail-left', rect(-360, -380, -300, 380, 70).color(cradlePaint));
add('cradle-rail-right', rect(300, -380, 360, 380, 70).color(cradlePaint));
add('cradle-cross-front', rect(-300, -340, 300, -290, 60).color(cradlePaint));
add('cradle-cross-rear', rect(-300, 290, 300, 340, 60).color(cradlePaint));
for (const y of [-150, 150]) {
  add(`cradle-beam-${y}`, rect(-300, y - 30, 300, y + 30, 60).translate(0, 0, 70).color(cradlePaint));
  for (const x of [-110, 110]) {
    add(`cradle-post-${x}-${y}`, rect(-28, -28, 28, 28, 185).translate(x, y, 130).color(cradlePaint));
    add(`timber-pad-${x}-${y}`, rect(-45, -45, 45, 45, 55).translate(x, y, 315).color(timber));
  }
}

return p.model();
