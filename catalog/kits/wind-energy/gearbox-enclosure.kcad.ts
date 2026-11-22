// SPDX-License-Identifier: CC0-1.0
// Wind turbine main gearbox: the multi-stage speed increaser between the slow
// rotor shaft and the fast generator. What makes it one: a round planetary
// housing on the rotor side, swallowing the main shaft through a shrink disc,
// two cast torque arms that hang the whole box on elastomer bushings, and a
// taller parallel-stage housing at the back whose offset high-speed shaft
// carries the brake disc and generator coupling.
// Stylized catalog geometry, millimetres, Z up, rotor axis along X (rotor at -X).
meta({
  name: "gearbox-enclosure",
  license: 'CC0-1.0',
  title: "Wind turbine main gearbox",
  description: "Three-stage wind turbine gearbox: main shaft and shrink disc entering a ribbed two-stage planetary housing, cast torque arms on elastomer bushings over bedplate pedestals, a parallel-stage housing with bearing caps, inspection cover, oil filter, breather and lifting eyes, and an offset high-speed shaft with brake disc, caliper and coupling. Material controls: cast steel, painted steel, stainless steel and elastomer; weathered, high-visibility and factory-grey presets.",
  tags: ['wind', 'energy', 'renewable', 'gearbox', 'drivetrain', 'nacelle', 'planetary', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const castSteel = param('castSteel', '#7d8b90', { label: 'Cast steel housing' });
const paintedSteel = param('paintedSteel', '#3f5f6b', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#c3cbce', { label: 'Stainless steel' });
const elastomer = param('elastomer', '#2b2f31', { label: 'Elastomer bushings' });

presets({
  weathered: { castSteel: '#6c7476', paintedSteel: '#415961', stainlessSteel: '#9da5a6', elastomer: '#363a3b' },
  highVisibility: { castSteel: '#8e9a9e', paintedSteel: '#d8a62b', stainlessSteel: '#d6dcde', elastomer: '#1f2224' },
  factoryGrey: { castSteel: '#b4b9b5', paintedSteel: '#34477a', stainlessSteel: '#cfd5d7', elastomer: '#2a2d2f' },
});

const p = assembly("gearbox-enclosure");
const add = (name, shape) => p.part(name, shape.scale(scale));
const cast = (name, shape) => add(name, shape.color(castSteel));
const painted = (name, shape) => add(name, shape.color(paintedSteel));
const steel = (name, shape) => add(name, shape.color(stainlessSteel));
const rubber = (name, shape) => add(name, shape.color(elastomer));
const bar = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z + h / 2);

const AX = 1150; // rotor axis height
// (radius, x) outline revolved about an X-direction axis through (y, z).
const axial = (pts, y = 0, z = AX) => {
  let outline = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, s] of pts.slice(1)) outline = outline.lineTo(r, s);
  return outline.close().revolve().rotateY(90).translate(0, y, z);
};
// Closed (y, z) outline extruded along X from x0 to x0 + length.
const xPrism = (pts, x0, length) => {
  let outline = path().moveTo(pts[0][0], pts[0][1]);
  for (const [y, z] of pts.slice(1)) outline = outline.lineTo(y, z);
  return outline.close().extrude(length).rotateX(90).rotateZ(90).translate(x0, 0, 0);
};

// Main shaft and shrink disc: the rotor torque enters here.
steel('main-shaft', axial([[0, -1650], [300, -1650], [300, -1560], [235, -1560], [235, -960], [0, -960]]));
steel('shrink-disc', axial([[235, -1220], [390, -1200], [400, -1100], [390, -1000], [235, -980]]));
for (let i = 0; i < 12; i += 1) {
  const a = (i * 2 * Math.PI) / 12;
  steel('shrink-bolt-' + (i + 1), cylinder(50, 22, 6).rotateY(-90).translate(-1200, 345 * Math.cos(a), AX + 345 * Math.sin(a)));
}

// Planetary stages: large first-stage ring, stepped second stage, cast ribs.
cast('planetary-housing', axial([
  [0, -960], [620, -960], [700, -920], [770, -880], [770, -520], [700, -490],
  [640, -460], [640, -120], [600, -80], [600, 80], [0, 80],
]));
for (const [i, s] of [-830, -700, -580, -380, -240].entries()) {
  const r = s < -500 ? 820 : 680;
  cast('housing-rib-' + (i + 1), axial([[r - 70, s], [r, s], [r, s + 34], [r - 70, s + 34]]));
}
painted('ring-gear-band', axial([[770, -540], [790, -540], [790, -500], [770, -500]]));

// Torque arms: cast wings that carry the gearbox on the bedplate.
const arm = [[640, AX - 380], [1150, AX - 270], [1290, AX - 160], [1290, AX + 70], [1150, AX + 180], [640, AX + 320]];
for (const side of [-1, 1]) {
  const s = side < 0 ? '-left' : '-right';
  cast('torque-arm' + s, xPrism(arm.map(([y, z]) => [side * y, z]), -880, 360));
  rubber('torque-bushing-upper' + s, cylinder(170, 150, 16).translate(-700, side * 1170, AX + 70));
  rubber('torque-bushing-lower' + s, cylinder(170, 150, 16).translate(-700, side * 1170, AX - 440));
  steel('torque-pin' + s, cylinder(920, 55, 10).translate(-700, side * 1170, AX - 560));
  painted('support-pedestal' + s, xPrism([[side * 920, 200], [side * 1420, 200], [side * 1420, AX - 440], [side * 920, AX - 440]], -980, 560));
  painted('bedplate-rail' + s, bar(-250, side * 1170, 0, 2700, 360, 200));
}

// Parallel stage: taller housing lifting the output shaft above the axis.
const ph = [[-560, AX - 620], [560, AX - 620], [640, AX - 470], [640, AX + 620], [500, AX + 840], [-500, AX + 840], [-640, AX + 620], [-640, AX - 470]];
cast('parallel-housing', xPrism(ph, 80, 640));
cast('split-flange', xPrism([[-680, AX + 60], [680, AX + 60], [680, AX + 120], [-680, AX + 120]], 60, 680));
painted('rear-cover', xPrism(ph.map(([y, z]) => [y * 0.86, AX + (z - AX) * 0.86 + 40]), 720, 40));
cast('bearing-cap-intermediate', axial([[0, 760], [190, 760], [190, 810], [150, 840], [0, 840]], 230, AX + 120));
cast('bearing-cap-low', axial([[0, 760], [210, 760], [210, 820], [0, 820]], 0, AX - 300));
painted('inspection-cover', bar(400, 0, AX + 840, 420, 520, 34));
painted('breather', cylinder(140, 40, 10).translate(560, 300, AX + 840));
for (const x of [220, 620]) {
  steel('lifting-eye-' + (x < 400 ? 'front' : 'rear'), torus(110, 28, 12).rotateX(90).translate(x, 0, AX + 940));
}
painted('oil-filter', cylinder(420, 115, 16).translate(420, -760, AX - 520));
steel('oil-filter-head', cylinder(70, 125, 16).translate(420, -760, AX - 100));
steel('oil-line', cylinder(260, 25, 8).rotateX(90).translate(420, -640, AX - 70));

// High-speed output: offset shaft, brake disc and caliper, generator coupling.
const hy = -220;
const hz = AX + 470;
steel('high-speed-shaft', axial([[0, 760], [95, 760], [95, 1420], [0, 1420]], hy, hz));
steel('brake-disc', axial([[95, 900], [400, 900], [400, 940], [95, 940]], hy, hz));
painted('brake-caliper', bar(920, hy, hz + 300, 150, 200, 220));
painted('coupling-hub', axial([[0, 1120], [180, 1120], [180, 1260], [130, 1290], [130, 1420], [0, 1420]], hy, hz));
rubber('coupling-insert', axial([[0, 1260], [175, 1260], [175, 1300], [0, 1300]], hy, hz));

return p.model();
