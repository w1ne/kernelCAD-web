// SPDX-License-Identifier: CC0-1.0
// Observation hive: a one-frame-thick glass-sided beehive shown indoors at
// schools, visitor centres and fairs.
// What makes it an observation hive rather than a cabinet: a tall, narrow
// timber case only one comb thick, three stacked glazed windows showing the
// comb inside (pale honey comb at the top, darker capped brood below, bees
// clustered on it), glazing-bar mullions and light reflections across the
// glass, a feeder jar standing upside down on the top cap, a clear entrance
// tube leaving the bottom corner to run out through a window, and a pivot
// pedestal on a cross foot so the hive can be turned to show either face.
// Generic visualization geometry at real size (three deep frames, 1.4 m
// tall), millimetres, Z up, ground on z = 0, glass face toward -Y.

meta({
  name: "observation-hive",
  license: 'CC0-1.0',
  title: "Observation hive",
  description: "Indoor observation beehive: tall one-comb-thick timber case with three stacked glazed windows showing honey comb above and capped brood below with clustered bees, glazing bars and glass reflections, inverted feeder jar on the top cap, clear entrance tube leaving the bottom corner, pivot post on a cross foot. Material controls: case timber, comb wax, capped brood, glass. Feeder-jar choice; freshApiary, weatheredYard and darkComb presets.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'beehive', 'observation hive', 'education', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const feeder = param('feeder', 'jar', { choices: ['jar', 'none'], label: 'Feeder jar on top' });

const timber = param('timber', '#b8874a', { label: 'Case, pedestal and glazing bars (timber)' });
const comb = param('comb', '#e8c262', { label: 'Honey comb (beeswax)' });
const brood = param('brood', '#a8723a', { label: 'Capped brood comb' });
const glass = param('glass', '#cfe6e6', { label: 'Glass reflections, jar and entrance tube' });

presets({
  freshApiary: { timber: '#d4a462', comb: '#f1d07a', brood: '#b98245', glass: '#e4f2f1' },
  weatheredYard: { timber: '#68543d', comb: '#c99a3e', brood: '#7c522a', glass: '#a9c4c2' },
  darkComb: { timber: '#c39a63', comb: '#b07a2c', brood: '#5e3b1d', glass: '#d7ebea' },
});

const p = assembly("observation-hive");
const add = (name, shape) => p.part(name, shape.scale(scale));
const b = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z + h / 2);
const BEE = '#2b2117';

// Pivot pedestal: cross foot, post and turntable.
add('foot-x', b(0, 0, 0, 640, 70, 50).color(timber));
add('foot-y', b(0, 0, 0, 70, 480, 50).color(timber));
add('pivot-post', cylinder(400, 34, 14).translate(0, 0, 50).color(timber));
add('turntable', cylinder(30, 110, 20).translate(0, 0, 450).color(timber));

// Case: base, side posts, top cap. One comb thick (100 mm).
const W = 500;
const T = 100;
const Z0 = 480;
const WIN = 230; // window height
const BAR = 30; // glazing bar between windows
const Z1 = Z0 + 60;
const ZTOP = Z1 + 3 * WIN + 2 * BAR;
add('case-base', b(0, 0, Z0, W + 60, T + 40, 60).color(timber));
for (const sx of [-1, 1]) add(`case-post-${sx}`, b(sx * (W / 2 + 15), 0, Z1, 30, T, ZTOP - Z1).color(timber));
add('top-cap', b(0, 0, ZTOP, W + 60, T + 40, 50).color(timber));
add('top-cap-trim', b(0, 0, ZTOP + 50, W + 30, T + 10, 14).color(timber));

// Comb inside: honey comb in the top window, capped brood below with a
// honey arc above it, and a slightly recessed back wall of comb.
const wz = (i) => Z1 + i * (WIN + BAR);
add('comb-back', b(0, 0, Z1, W, T - 40, ZTOP - Z1).color(comb));
for (let i = 0; i < 3; i += 1) {
  const z = wz(i);
  if (i < 2) {
    add(`brood-patch-${i}`, b(0, -T / 2 + 18, z + 20, W - 80, 4, WIN - (i === 1 ? 90 : 40)).color(brood));
  }
  if (i < 2) add(`glazing-bar-${i}`, b(0, -T / 2 + 6, z + WIN, W, 18, BAR).color(timber));
}
// Glass reflections: pairs of diagonal streaks on each window.
for (let i = 0; i < 3; i += 1) {
  const z = wz(i) + WIN / 2;
  add(`reflection-${i}-a`, box(16, 2, WIN - 30, true).rotateY(28).translate(-90 + i * 30, -T / 2 + 2, z).color(glass));
  add(`reflection-${i}-b`, box(6, 2, WIN - 70, true).rotateY(28).translate(-50 + i * 30, -T / 2 + 2, z).color(glass));
}
// Bees clustered on the brood face and the comb.
const bees = [
  [-150, 610], [-110, 640], [-70, 600], [-40, 660], [20, 620], [60, 580], [110, 650], [150, 600],
  [-120, 860], [-60, 900], [10, 880], [80, 840], [130, 900], [-20, 1080], [60, 1120], [-140, 1150],
];
bees.forEach(([x, z], i) => {
  add(`bee-${i + 1}`, sphere(10).scale([1.7, 1, 1]).rotateY(-90 + ((i * 47) % 90) - 45).translate(x, -T / 2 + 16, z).color(BEE));
});

// Entrance tube from the bottom corner of the case out to the side.
const tube = (x0, z0, x1, z1) => {
  const len = Math.hypot(x1 - x0, z1 - z0);
  return cylinder(len, 22, 12).rotateY((Math.atan2(x1 - x0, z1 - z0) * 180) / Math.PI).translate(x0, 0, z0);
};
add('entrance-block', b(W / 2 + 45, 0, Z1 + 10, 40, 70, 60).color(timber));
add('entrance-tube-a', tube(W / 2 + 60, Z1 + 40, W / 2 + 220, Z1 + 40).color(glass));
add('entrance-tube-b', tube(W / 2 + 220, Z1 + 40, W / 2 + 300, Z1 + 260).color(glass));

// Inverted feeder jar on the top cap.
if (feeder.value === 'jar') {
  add('feeder-collar', cylinder(16, 60, 16).translate(-150, 0, ZTOP + 64).color(timber));
  add('feeder-jar', cylinder(170, 55, 16).translate(-150, 0, ZTOP + 80).color(glass));
  add('feeder-syrup', cylinder(110, 57, 16).translate(-150, 0, ZTOP + 82).color(comb));
  add('feeder-base', cylinder(14, 40, 16).translate(-150, 0, ZTOP + 250).color(glass));
}

return p.model();
