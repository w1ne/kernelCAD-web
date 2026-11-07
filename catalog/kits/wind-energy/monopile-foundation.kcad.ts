// SPDX-License-Identifier: CC0-1.0
// Offshore monopile foundation: the single large steel tube driven into the
// seabed that carries an offshore wind turbine. What makes it one: a hollow
// tapered pile rising out of a rock scour-protection apron, a yellow
// splash-zone coating above the waterline band, a bolted top flange for the
// transition piece, J-tubes that bring the export cables down the pile and out
// through bell mouths, and sacrificial anodes on stand-offs below water.
// Stylized catalog geometry, scaled down and millimetres, Z up, seabed at z = 0.
meta({
  name: "monopile-foundation",
  license: 'CC0-1.0',
  title: "Offshore monopile foundation",
  description: "Hollow steel monopile on a rock scour-protection apron, with a yellow splash-zone coating, bolted top flange, two cable J-tubes with clamps and bell mouths, and six sacrificial anodes on stand-offs. Material controls: marine steel, splash-zone coating, anode zinc and scour rock; weathered, high-visibility and grey-coating presets.",
  tags: ['wind', 'energy', 'renewable', 'offshore', 'monopile', 'foundation', 'marine', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'marine', 'scene'],
  triangleBudget: 4000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const marineSteel = param('marineSteel', '#3d5866', { label: 'Marine steel' });
const splashCoating = param('splashCoating', '#efb532', { label: 'Splash-zone coating' });
const anodeZinc = param('anodeZinc', '#c7c4b8', { label: 'Anode zinc' });
const scourRock = param('scourRock', '#7d766a', { label: 'Scour rock' });

presets({
  weathered: { marineSteel: '#3a4446', splashCoating: '#c99a3a', anodeZinc: '#a9a596', scourRock: '#5f5a50' },
  highVisibility: { marineSteel: '#2d4d5c', splashCoating: '#f7c331', anodeZinc: '#dcd9cf', scourRock: '#8a8376' },
  greyCoating: { marineSteel: '#4a5458', splashCoating: '#9aa3a6', anodeZinc: '#c7c4b8', scourRock: '#6e695f' },
});

const p = assembly("monopile-foundation");
const add = (name, shape) => p.part(name, shape.scale(scale));
const steel = (name, shape) => add(name, shape.color(marineSteel));
const coat = (name, shape) => add(name, shape.color(splashCoating));
const zinc = (name, shape) => add(name, shape.color(anodeZinc));
const rock = (name, shape) => add(name, shape.color(scourRock));
// (radius, z) outline revolved about the pile axis.
const ring = (pts) => {
  let outline = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) outline = outline.lineTo(r, z);
  return outline.close().revolve();
};

const R = 700; // upper pile radius
const top = 6400;
const coatZ = 4300;

// Scour protection: a low rock apron with loose armour stones on top.
rock('scour-apron', ring([[0, 0], [2700, 0], [2500, 110], [1500, 300], [740, 380], [0, 380]]));
const stones = [
  [1150, 15, 300, 260], [1350, 70, 220, 230], [1750, 125, 180, 200], [2150, 160, 140, 170], [1300, 200, 290, 250],
  [1700, 245, 200, 220], [2200, 290, 120, 160], [1100, 325, 310, 240], [1500, 30, 250, 210], [1950, 95, 160, 190],
  [1250, 140, 280, 220], [1600, 185, 220, 240], [2000, 230, 150, 180], [1400, 270, 260, 230], [1850, 340, 170, 200],
];
stones.forEach(([d, deg, z, s], i) => {
  const a = (deg * Math.PI) / 180;
  rock('armour-stone-' + (i + 1), cylinder(s * 0.6, s / 2, 5).rotateX(20 + (i % 4) * 15).rotateZ(i * 37).translate(d * Math.cos(a), d * Math.sin(a), z));
});

// Pile: hollow tapered tube, bare below the coating line, yellow above.
steel('pile', ring([[R - 40, 0], [R, 0], [R, coatZ], [R - 40, coatZ]]));
coat('splash-zone-section', ring([[R - 40, coatZ], [R, coatZ], [R, top], [R - 40, top]]));
steel('waterline-band', ring([[R, coatZ - 60], [R + 12, coatZ - 60], [R + 12, coatZ], [R, coatZ]]));
steel('top-flange', ring([[R - 160, top], [R + 40, top], [R + 40, top + 110], [R - 160, top + 110]]));
for (let i = 0; i < 32; i += 1) {
  const a = (i * 2 * Math.PI) / 32;
  zinc('flange-bolt-' + (i + 1), cylinder(70, 22, 6).translate((R - 70) * Math.cos(a), (R - 70) * Math.sin(a), top + 110));
}

// J-tubes: cable conduits clamped down the pile, bending out to bell mouths.
const bendLen = 1550;
const bendDx = bendLen * Math.sin((42 * Math.PI) / 180);
const bendDz = bendLen * Math.cos((42 * Math.PI) / 180);
for (const [i, deg] of [200, 235].entries()) {
  const j = 'j-tube-' + (i + 1);
  const off = R + 110;
  // Built on +X, then swung round the pile to its bearing.
  const around = (shape) => shape.rotateZ(deg);
  steel(j, around(cylinder(5600 - 1500, 70, 12).translate(off, 0, 1500)));
  steel(j + '-bend', around(cylinder(bendLen, 70, 12).rotateY(-42).translate(off + bendDx, 0, 1500 - bendDz)));
  steel(j + '-bell-mouth', around(ring([[55, 0], [70, 0], [180, -220], [150, -220]]).rotateY(-42).translate(off + bendDx, 0, 1500 - bendDz)));
  steel(j + '-hang-off', around(ring([[0, 0], [130, 0], [130, 120], [0, 120]]).translate(off, 0, 5600)));
  for (const z of [2200, 3300, 4400]) steel(j + '-clamp-' + z, around(box(170, 200, 80, true).translate(R + 60, 0, z)));
}

// Sacrificial anodes on stand-offs around the submerged pile.
for (let i = 0; i < 6; i += 1) {
  const z = i % 2 ? 1800 : 2700;
  steel('anode-standoff-' + (i + 1), box(180, 50, 50, true).translate(R + 70, 0, z + 350).rotateZ(i * 60 + 30));
  zinc('anode-' + (i + 1), box(120, 120, 700, true).translate(R + 200, 0, z + 350).rotateZ(i * 60 + 30));
}

return p.model();
