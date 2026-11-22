// SPDX-License-Identifier: CC0-1.0
// Coir slab holder: a substrate-culture station for tomatoes, cucumbers and
// peppers, the way a high-wire greenhouse grows them.
// What makes it a coir slab holder: a galvanised U-gutter carried on two
// trestle stands, a film-wrapped coco coir slab lying in it with planting
// windows cut through the film, a rockwool propagation cube in each window
// with a young plant, a drip stake pushed into every cube on a spaghetti
// tube from the black lateral running along the back, and drainage slits
// along the slab's front edge over a drain outlet at the gutter's low end.
// Generic visualization geometry at about real size (slab 1000 x 200 x
// 75 mm on a 1.4 m gutter), millimetres, Z up, front -Y.

meta({
  name: "coco-coir-slab-holder",
  license: 'CC0-1.0',
  title: "Coir slab holder",
  description: "Substrate-culture coir slab station at about real size: galvanised U-gutter on two trestle stands, a film-wrapped coco coir slab with planting windows, three rockwool cubes with young plants, a drip stake in each cube fed by spaghetti tube from the black lateral along the back, drainage slits on the slab front and a drain outlet at the gutter end. Material controls: gutter and stands, slab film, coir, drip line and foliage. whiteFilm, blackFilm, cucumber and weathered presets.",
  tags: ['coir slab', 'coco coir', 'grow slab', 'substrate culture', 'rockwool cube', 'drip irrigation', 'grow gutter', 'tomato', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 4000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const gutter = param('gutter', '#b8bfc2', { label: 'Gutter and stands (galvanised steel)' });
const film = param('slabFilm', '#ecebe4', { label: 'Slab film (UV polyethylene)' });
const coir = param('coir', '#7a4e2c', { label: 'Coir and rockwool' });
const drip = param('dripLine', '#1f2326', { label: 'Drip line (PE)' });
const foliage = param('foliage', '#4f8a3a', { label: 'Foliage' });

presets({
  whiteFilm: { gutter: '#b8bfc2', slabFilm: '#ecebe4', coir: '#7a4e2c', dripLine: '#1f2326', foliage: '#4f8a3a' },
  blackFilm: { gutter: '#a7adb0', slabFilm: '#2a2c2e', coir: '#86593a', dripLine: '#3a3f44', foliage: '#3f7d34' },
  cucumber: { gutter: '#d0d4d2', slabFilm: '#f2f0e6', coir: '#6d4426', dripLine: '#1f2326', foliage: '#6aa54a' },
  weathered: { gutter: '#8d9290', slabFilm: '#cfcab8', coir: '#5e3f27', dripLine: '#2c2f30', foliage: '#6f8a45' },
});

const p = assembly("coco-coir-slab-holder");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 6) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const arc = (name: string, a: [number, number, number], b: [number, number, number], lift: number, r: number, n: number, col: string) => {
  const pt = (u: number): [number, number, number] => [
    a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u + Math.sin(Math.PI * u) * lift,
  ];
  for (let k = 0; k < n; k++) add(`${name}-${k}`, rod(pt(k / n), pt((k + 1) / n), r).color(col));
};

// Trestle stands: splayed legs, a cross-head and a cradle the gutter sits in.
const GZ = 560; // gutter underside
for (const x of [-520, 520]) {
  add(`stand-head-${x}`, blk(x, 0, GZ - 40, 50, 360, 40).color(gutter));
  add(`stand-leg-front-${x}`, rod([x, -230, 40], [x, -60, GZ - 40], 16, 8).color(gutter));
  add(`stand-leg-back-${x}`, rod([x, 230, 40], [x, 60, GZ - 40], 16, 8).color(gutter));
  add(`stand-foot-front-${x}`, blk(x, -235, 0, 70, 110, 40).color('#3b3f42'));
  add(`stand-foot-back-${x}`, blk(x, 235, 0, 70, 110, 40).color('#3b3f42'));
  add(`stand-brace-${x}`, blk(x, 0, 220, 30, 360, 30).color(gutter));
}

// U-gutter with rolled lips, slightly longer than the slab.
const GW = 150, GH = 55, L = 1400;
add("gutter", profileYZ([
  [-GW - 14, GZ + GH], [-GW - 14, GZ + GH - 12], [-GW, GZ + GH - 12], [-GW, GZ], [GW, GZ], [GW, GZ + GH - 12],
  [GW + 14, GZ + GH - 12], [GW + 14, GZ + GH], [GW - 6, GZ + GH], [GW - 6, GZ + 6], [-GW + 6, GZ + 6], [-GW + 6, GZ + GH],
], L).color(gutter));
add("gutter-end-left", blk(-L / 2 - 3, 0, GZ, 6, 2 * GW, GH - 12).color(gutter));
add("gutter-end-right", blk(L / 2 + 3, 0, GZ, 6, 2 * GW, GH - 12).color(gutter));
// Drain outlet at the low (right) end, dropping to a return line.
add("drain-spigot", cylZ(L / 2 - 70, 0, GZ - 80, 80, 22, 12).color(drip));
add("drain-elbow", sphere(26).translate(L / 2 - 70, 0, GZ - 90).color(drip));
add("drain-pipe", cylinder(260, 22, 12).rotateY(90).translate(L / 2 - 70, 0, GZ - 90).color(drip));

// Slab: film-wrapped coir, heat-sealed ends, three planting windows.
const SZ = GZ + 8, SL = 1000, SW = 200, SH = 75;
add("slab", blk(0, 0, SZ, SL, SW, SH).color(film));
add("slab-seal-left", blk(-SL / 2 - 12, 0, SZ + 20, 24, SW - 30, 34).color(film));
add("slab-seal-right", blk(SL / 2 + 12, 0, SZ + 20, 24, SW - 30, 34).color(film));
for (const x of [-410, -150, 150, 410]) add(`drain-slit-${x}`, blk(x, -SW / 2 - 0.5, SZ + 4, 60, 2, 10).color(coir));
add("slab-print", blk(-300, -SW / 2 - 0.5, SZ + 30, 180, 2, 22).color('#4f8a3a'));

const plants = [-330, 0, 330];
for (const x of plants) {
  // Window cut through the film showing coir, rockwool cube standing in it.
  add(`window-${x}`, blk(x, 0, SZ + SH, 130, 130, 1).color(coir));
  add(`cube-${x}`, blk(x, 0, SZ + SH, 100, 100, 70).color('#c9c08f'));
  add(`cube-wrap-${x}`, blk(x, 0, SZ + SH + 0.5, 102, 102, 30).color(film));
  const top = SZ + SH + 70;
  // Young plant: stem, alternating leaf blades and a top tuft.
  add(`stem-${x}`, cylZ(x, 0, top, 300, 7, 8).color('#5d8f3a'));
  for (let k = 0; k < 4; k++) {
    const z = top + 70 + k * 60;
    const yaw = k * 100 + (x / 3);
    add(`leaf-${x}-${k}`, box(150 - k * 18, 60 - k * 6, 4, true).translate(70 - k * 9, 0, 0).rotateY(-18).rotateZ(yaw).translate(x, 0, z).color(foliage));
  }
  add(`crown-${x}`, sphere(38).translate(x, 0, top + 315).color(foliage));
  // Drip stake angled into the cube, spaghetti tube up and over to the lateral.
  add(`stake-${x}`, rod([x + 30, 30, top - 30], [x + 60, 70, top + 40], 4).color(drip));
  add(`stake-head-${x}`, cylZ(x + 60, 70, top + 40, 14, 8, 8).color('#c0392b'));
  arc(`spaghetti-${x}`, [x + 60, 70, top + 54], [x + 120, SW / 2 + 40, SZ + SH + 20], 60, 3, 4, drip);
}

// Lateral drip line along the back, clipped to the gutter lip.
add("lateral", cylinder(L + 100, 9, 10).rotateY(90).translate(-L / 2 - 50, SW / 2 + 40, SZ + SH + 20).color(drip));
for (const x of [-560, 0, 560]) add(`lateral-clip-${x}`, blk(x, GW + 6, GZ + GH - 12, 24, 40, 50).color('#3b3f42'));
add("lateral-end", cylZ(-L / 2 - 60, SW / 2 + 40, SZ + SH + 8, 24, 13, 8).color('#c0392b'));

return p.model();
