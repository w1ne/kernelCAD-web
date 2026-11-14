// SPDX-License-Identifier: CC0-1.0
// Ten-hole diatonic harmonica.
// What makes it a harmonica rather than a bar: a sandwich of comb, brass
// reed plates and two pressed stainless covers. The comb shows ten square
// mouth holes between its tines along the front edge; the covers rise from a
// front lip to a flat crown, fall away to open rear vents and close in over
// the rounded ends, and the reed plates show as a brass line top and bottom.
// Generic visualization geometry at real size (101 x 28 x 22 mm),
// millimetres, Z up, holes facing -Y, lying flat on z = 0.
meta({
  name: 'harmonica',
  license: 'CC0-1.0',
  title: 'Harmonica',
  description: 'Ten-hole diatonic harmonica at real size: comb with ten mouth holes between its tines, brass reed plates showing as a line top and bottom, pressed stainless covers with a front lip, flat crown, open rear vents and closed rounded ends, plus cover screws. Material controls: stainless covers, brass reed plates and screws, comb polymer. Concert, vintage and pearwood presets.',
  tags: ['harmonica', 'mouth organ', 'blues harp', 'diatonic', 'music', 'instrument', 'blues', 'low poly', 'CC0'],
  kit: 'music',
  category: 'prop',
  origin: 'base',
  compat: ['music', 'orchestra', 'stage', 'indoor'],
  triangleBudget: 900
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const stainless = param('stainless', '#c3ccd0', { label: 'Stainless covers' });
const brass = param('brass', '#c9933a', { label: 'Brass reed plates and screws' });
const polymer = param('polymer', '#2a2e34', { label: 'Comb polymer' });

presets({
  concert: { stainless: '#e1e8ea', polymer: '#d8d2c4' },
  vintage: { stainless: '#8c928f', brass: '#9c7434', polymer: '#4a3a2c' },
  pearwood: { stainless: '#d0d7d9', polymer: '#a8703e' },
});

const p = assembly('harmonica');
const add = (name, shape) => p.part(name, shape.scale(scale));

const L = 101;
const W = 27;
const ZM = 10.6; // mid-plane of the comb: the bottom cover crown sits on z = 0

// Comb: back wall plus eleven tines leaving ten square holes at the front.
add('comb-back', box(L - 6, 11, 6, true).translate(0, 7, ZM).color(polymer));
const holePitch = (L - 10) / 10;
for (let i = 0; i <= 10; i += 1) {
  const x = -(L - 10) / 2 + i * holePitch;
  add(`tine-${i}`, box(i === 0 || i === 10 ? 5 : 3.4, W - 11, 6, true).translate(x + (i === 0 ? -1 : i === 10 ? 1 : 0), -5.5, ZM).color(polymer));
}
// Brass reed plates top and bottom.
for (const s of [-1, 1]) {
  add(`reed-plate-${s}`, box(L - 4, W - 1, 1.2, true).translate(0, 0.5, ZM + s * 3.6).color(brass));
}

// Pressed cover: (y, z) side profile lofted along X with closed, rounded ends.
const coverProfile = (k, s) => {
  // k shrinks the crown toward the ends; s = +1 top cover, -1 bottom.
  const pts = [[-W / 2, 4.2], [-W / 2 + 1, 5.4 + 4.6 * k], [-W / 2 + 6, 6.6 + 4 * k], [W / 2 - 9, 6.6 + 4 * k], [W / 2 - 1, 4.6 + 1.6 * k], [W / 2 - 1, 4.2]];
  let pb = path().moveTo(pts[0][0], s * pts[0][1]);
  for (const [y, z] of pts.slice(1)) pb = pb.lineTo(y, s * z);
  return pb.close();
};
const cover = (s) => {
  const ks = [0.15, 0.75, 1, 1, 0.75, 0.15];
  const xs = [-L / 2, -L / 2 + 2.5, -L / 2 + 7, L / 2 - 7, L / 2 - 2.5, L / 2];
  const secs = ks.map((k) => coverProfile(k, s));
  const loftPlanes = xs.map((x) => ({ plane: 'XY' as const, origin: [0, 0, x] as [number, number, number] }));
  // Local (x, y, z) = (y, z, x) in the world.
  return secs[0].loft(secs.slice(1), { planes: loftPlanes, ruled: true }).rotateX(90).rotateZ(90).translate(0, 0, ZM);
};
add('top-cover', cover(1).color(stainless));
add('bottom-cover', cover(-1).color(stainless));
// Cover screws on the crown: two at the ends, one centre.
for (const x of [-L / 2 + 6, 0, L / 2 - 6]) {
  add(`screw-${Math.round(x)}`, extrudePolygon(Array.from({ length: 6 }, (_, i) => [1.8 * Math.cos((Math.PI * i) / 3), 1.8 * Math.sin((Math.PI * i) / 3)]), 1).translate(x, 0, ZM + (x === 0 ? 10.4 : 9.6)).color(brass));
}

return p.model();
