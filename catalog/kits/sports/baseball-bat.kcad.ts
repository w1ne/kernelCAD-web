// SPDX-License-Identifier: CC0-1.0
// Wood baseball bat lying on the ground: what makes it one is the turned
// profile — a flared knob, a thin 24 mm handle that swells through a long
// taper into a 2.6 in (66 mm) barrel, and a cupped end — finished two-tone with
// a stained barrel, taped grip and a branded oval on the barrel. Generic
// visualization geometry at about real size (a 33 in bat is 838 mm long),
// millimetres, Z up, barrel resting on z = 0.
meta({
  name: 'baseball-bat',
  license: 'CC0-1.0',
  title: 'Baseball bat',
  description: "Wood baseball bat at about real size, lying on the ground: turned knob, thin handle with wrapped grip tape, long taper into a 66 mm barrel with a cupped end, two-tone natural handle and stained barrel, branded oval and end-grain knob face. The length choice (30-34 in) stretches the turning. Material controls: maple handle, barrel finish, grip tape, brand ink, end grain; natural, blackOut and weathered presets.",
  tags: ['baseball bat', 'bat', 'baseball', 'softball', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const length = param('length', '33in', { choices: ['30in', '32in', '33in', '34in'], label: 'Length' });
const mapleWood = param('mapleWood', '#d6ad72', { label: 'Maple handle wood' });
const barrelFinish = param('barrelFinish', '#6e2f22', { label: 'Barrel finish' });
const gripTape = param('gripTape', '#30363a', { label: 'Grip tape' });
const brandInk = param('brandInk', '#e8c25a', { label: 'Brand ink' });
const endGrain = param('endGrain', '#c39a64', { label: 'End-grain wood' });
presets({
  clubColors: { barrelFinish: '#bd8b51', gripTape: '#c5443d' },
  natural: { barrelFinish: '#d6ad72', brandInk: '#1f2224' },
  blackOut: { mapleWood: '#26282a', barrelFinish: '#1b1c1e', gripTape: '#8a2c25', brandInk: '#c9cfd2', endGrain: '#3a3634' },
  weathered: { mapleWood: '#a88a64', barrelFinish: '#5b3a2e', gripTape: '#4a4a48', brandInk: '#a59162', endGrain: '#9b8466' },
});

const p = assembly('baseball-bat');
const add = (name, shape) => p.part(name, shape.scale(scale));

const L = { '30in': 762, '32in': 813, '33in': 838, '34in': 864 }[length.value];
const BR = 33;                   // barrel radius
// Lengthwise stations (fractions of L) and radii, knob to cup.
const stations = [[0, 0], [0, 20], [0.006, 23], [0.012, 23], [0.019, 17], [0.028, 12.2], [0.24, 12.4], [0.36, 13.6],
  [0.45, 16.5], [0.53, 21], [0.61, 26.5], [0.69, 31], [0.76, BR], [0.985, BR], [1, 30], [1, 0]];
const prof = stations.map(([f, r]) => [r, f * L]);
// Cut the profile into the stretch between two stations (by length along the bat).
const section = (z0, z1) => {
  const rAt = (z) => {
    for (let i = 1; i < prof.length; i++) {
      const [r0, a] = prof[i - 1];
      const [r1, b] = prof[i];
      if (z >= a && z <= b && b > a) return r0 + ((r1 - r0) * (z - a)) / (b - a);
    }
    return 0;
  };
  const inside = prof.filter(([r, z]) => z > z0 && z < z1 && r > 0);
  return [[0, z0], [rAt(z0), z0], ...inside, [rAt(z1), z1], [0, z1]];
};
// Turned profile [[r, z], ...] revolved about Z, then laid along X.
const lay = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve().rotateY(90).translate(-L / 2, 0, BR);
};

const SPLIT = 0.4 * L;           // where the barrel stain starts
add('handle', lay(section(0.012 * L, SPLIT)).color(mapleWood));
add('knob', lay(section(0, 0.012 * L)).color(mapleWood));
// Barrel with the cupped end bored out.
add('barrel', lay(section(SPLIT, L)).subtract(cylinder(14, 17, 16).rotateY(90).translate(L / 2 - 10, 0, BR)).color(barrelFinish));
add('knob-face', cylinder(1, 19, 16).rotateY(90).translate(-L / 2 - 0.6, 0, BR).color(endGrain));
add('cup-floor', cylinder(1, 16, 16).rotateY(90).translate(L / 2 - 11, 0, BR).color(endGrain));
// Grip tape wrapped over the handle, finished with a collar of tape at the top.
add('grip-tape', lay([[11, 0.03 * L], [13.6, 0.035 * L], [13.6, 0.27 * L], [11, 0.275 * L]]).color(gripTape));
add('tape-collar', lay([[12, 0.27 * L], [14.8, 0.272 * L], [14.8, 0.285 * L], [12, 0.29 * L]]).color(gripTape));
// Branded oval on the barrel face: a thin skin of the barrel clipped to an ellipse.
const oval = extrudePolygon(Array.from({ length: 16 }, (_, i) => {
  const a = (2 * Math.PI * i) / 16;
  return [48 * Math.cos(a), 13 * Math.sin(a)];
}), 80).translate(0, 0, -40).rotateX(90);
add('brand-oval', cylinder(150, BR + 0.8, 24).rotateY(90).translate(0.72 * L - L / 2, 0, BR)
  .intersect(oval.translate(0.81 * L - L / 2, 0, BR + 16)).color(brandInk));

return p.model();
