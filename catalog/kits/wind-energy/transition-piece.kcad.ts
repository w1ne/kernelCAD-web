// SPDX-License-Identifier: CC0-1.0
// Offshore transition piece: the yellow steel can that slips over a monopile
// and carries the tower, the access platform and the boat landing. What makes
// it one: a grouted skirt sleeved over the grey pile, a cone up to the tower
// flange, a ring-shaped grated working platform on knee braces with guard rails
// and a davit crane, a watertight door at platform level, and a boat landing of
// two fendered tubes with a ladder that crew climb from the vessel.
// Stylized catalog geometry, scaled down and millimetres, Z up, boat landing
// on the -Y side.
meta({
  name: "transition-piece",
  license: 'CC0-1.0',
  title: "Offshore transition piece",
  description: "Yellow offshore transition piece sleeved over a grey monopile stub, with grout skirt, cone and bolted tower flange, a grated ring platform on knee braces with guard rails, davit crane, watertight door, external J-tube and a boat landing of two fendered tubes with an access ladder and rest platform. Material controls: marine steel, transition-piece coating, galvanized steel and fender rubber; weathered, high-visibility and grey-coating presets.",
  tags: ['wind', 'energy', 'renewable', 'offshore', 'transition piece', 'boat landing', 'platform', 'marine', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'marine', 'scene'],
  triangleBudget: 4800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const marineSteel = param('marineSteel', '#3d5866', { label: 'Marine steel' });
const safetyPaint = param('safetyPaint', '#efb532', { label: 'Transition-piece coating' });
const galvanizedSteel = param('galvanizedSteel', '#8b9c9e', { label: 'Galvanized steel' });
const fenderRubber = param('fenderRubber', '#2a2e30', { label: 'Fender rubber' });

presets({
  weathered: { marineSteel: '#3a4446', safetyPaint: '#c99a3a', galvanizedSteel: '#76858a', fenderRubber: '#363a3b' },
  highVisibility: { marineSteel: '#2d4d5c', safetyPaint: '#f7c331', galvanizedSteel: '#a9b6b8', fenderRubber: '#1f2224' },
  greyCoating: { marineSteel: '#3d5866', safetyPaint: '#9aa3a6', galvanizedSteel: '#c2c9cb', fenderRubber: '#d2a12e' },
});

const p = assembly("transition-piece");
const add = (name, shape) => p.part(name, shape.scale(scale));
const steel = (name, shape) => add(name, shape.color(marineSteel));
const coat = (name, shape) => add(name, shape.color(safetyPaint));
const galv = (name, shape) => add(name, shape.color(galvanizedSteel));
const rubber = (name, shape) => add(name, shape.color(fenderRubber));
const bar = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z + h / 2);
// (radius, z) outline revolved about the vertical axis.
const ring = (pts) => {
  let outline = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) outline = outline.lineTo(r, z);
  return outline.close().revolve();
};
// Built along +X, then swung to a bearing about the axis.
const at = (deg, shape) => shape.rotateZ(deg);

const pileR = 700;
const skirtR = 800;
const topR = 640;
const deckZ = 4300;
const flangeZ = 6600;

// Monopile stub below and the yellow can sleeved over it.
steel('monopile-stub', ring([[0, 0], [pileR, 0], [pileR, 900], [0, 900]]));
coat('grout-skirt', ring([[0, 800], [skirtR, 800], [skirtR, 3500], [0, 3500]]));
steel('grout-seal', ring([[skirtR, 800], [skirtR + 20, 800], [skirtR + 20, 880], [skirtR, 880]]));
coat('cone', ring([[0, 3500], [skirtR, 3500], [topR, 3900], [topR, flangeZ], [0, flangeZ]]));
galv('tower-flange', ring([[0, flangeZ], [topR + 60, flangeZ], [topR + 60, flangeZ + 100], [0, flangeZ + 100]]));
for (let i = 0; i < 24; i += 1) galv('flange-bolt-' + (i + 1), at(i * 15, cylinder(70, 20, 6).translate(topR + 20, 0, flangeZ + 100)));

// Working platform: grated ring deck on knee braces, rails, davit.
const deckR = 1650;
galv('platform-deck', ring([[topR, deckZ], [deckR, deckZ], [deckR, deckZ + 60], [topR, deckZ + 60]]));
galv('deck-toe-board', ring([[deckR - 20, deckZ + 60], [deckR, deckZ + 60], [deckR, deckZ + 210], [deckR - 20, deckZ + 210]]));
for (let i = 0; i < 8; i += 1) {
  const deg = i * 45 + 22.5;
  galv('deck-bearer-' + (i + 1), at(deg, bar((topR + deckR) / 2, 0, deckZ - 140, deckR - topR, 80, 140)));
  galv('knee-brace-' + (i + 1), at(deg, box(1250, 70, 70, true).rotateY(-38).translate(topR + 480, 0, deckZ - 520)));
}
for (let i = 0; i < 28; i += 1) {
  const deg = (i * 360) / 28;
  if (deg > 250 && deg < 290) continue; // gate over the boat-landing ladder
  galv('rail-post-' + (i + 1), at(deg, bar(deckR - 50, 0, deckZ + 60, 40, 40, 1100)));
}
galv('hand-rail', torus(deckR - 50, 22, 8).translate(0, 0, deckZ + 1160));
galv('knee-rail', torus(deckR - 50, 16, 8).translate(0, 0, deckZ + 620));

coat('davit-post', cylinder(1700, 90, 14).translate(900, 900, deckZ + 60));
coat('davit-jib', box(1500, 110, 110, true).rotateY(-12).translate(900 + 560, 900, deckZ + 1820));
galv('davit-winch', bar(900, 760, deckZ + 600, 200, 160, 200));
galv('davit-wire', cylinder(1450, 10, 6).translate(1620, 900, deckZ + 380));
steel('davit-hook', torus(60, 18, 10).rotateX(90).translate(1620, 900, deckZ + 330));

// Watertight door at platform level facing the landing.
steel('door-frame', bar(0, -topR - 20, deckZ + 60, 900, 80, 2000));
steel('door-leaf', bar(0, -topR - 60, deckZ + 110, 760, 40, 1880));
galv('door-handle', bar(280, -topR - 100, deckZ + 1000, 40, 40, 200));
coat('door-hood', bar(0, -topR - 120, deckZ + 2120, 1000, 220, 60));

// External J-tube carrying the export cable up to the platform.
steel('j-tube', cylinder(deckZ - 300, 80, 12).translate(-skirtR - 140, 300, 300));
steel('j-tube-bell-mouth', ring([[80, 0], [200, -260], [160, -260], [60, 0]]).translate(-skirtR - 140, 300, 300));
for (const z of [1400, 2600]) steel('j-tube-clamp-' + z, bar(-skirtR - 70, 300, z, 160, 160, 100));

// Boat landing: two fendered tubes, ladder, stand-off arms, rest platform.
const ly = -skirtR - 900;
const tubeX = 450;
for (const side of [-1, 1]) {
  const s = side < 0 ? '-left' : '-right';
  coat('landing-tube' + s, cylinder(deckZ - 300, 110, 14).translate(side * tubeX, ly, 300));
  for (const z of [700, 1700, 2700]) rubber('landing-fender' + s + '-' + z, cylinder(500, 140, 14).translate(side * tubeX, ly, z));
  for (const z of [1300, 3300]) coat('landing-arm' + s + '-' + z, bar(side * tubeX * 0.7, (ly - skirtR) / 2, z, 120, -ly - skirtR + 80, 120));
  galv('ladder-stile' + s, bar(side * 220, ly + 260, 400, 60, 50, deckZ - 340));
  galv('ladder-cage-hoop' + s, bar(side * 280, ly + 120, deckZ - 1800, 30, 30, 1700));
}
for (let z = 600; z < deckZ; z += 300) galv('ladder-rung-' + z, bar(0, ly + 260, z, 440, 40, 40));
galv('rest-platform', bar(0, ly + 380, 2900, 700, 420, 50));
galv('landing-top-gate', bar(0, (ly - deckR) / 2 + 200, deckZ, 700, -ly - deckR + 500, 60));

return p.model();
