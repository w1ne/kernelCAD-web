// SPDX-License-Identifier: CC0-1.0
// Conveyor transfer tower: the clad steel tower where an enclosed incline
// conveyor gallery delivers material high up and it drops inside to a
// low-level belt leaving at right angles. Distinct from an open transfer
// chute: everything is weatherproof. What makes it that tower: a tall square
// building of profiled cladding on corner columns, a mono-pitch roof with a
// round roof vent, a louvre band near the top, an inclined clad gallery with
// a window strip climbing in from a tail house and resting on a braced
// trestle, an open outgoing conveyor with load and a head pulley leaving at
// the base, a personnel door with steps, and a caged access ladder up to a
// railed landing at gallery level.
// Generic visualization geometry at about real size (16 m long, 6.6 m
// tall), millimetres, Z up, door and ladder on -Y.

meta({
  name: "conveyor-transfer-tower",
  license: 'CC0-1.0',
  title: "Conveyor transfer tower",
  description: "Enclosed conveyor transfer tower at about real size: clad square tower on corner columns with mono-pitch roof, roof vent and louvre band, inclined clad conveyor gallery with window strip arriving from a tail house over a braced trestle, outgoing open conveyor with load and head pulley at the base, personnel door with steps, caged ladder to a railed landing. Material controls: cladding, structure, gallery and belts. plant, weathered, highVisibility and oxide presets.",
  tags: ["recycling", "conveyor", "transfer tower", "conveyor gallery", "trestle", "cladding", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cladding = param('cladding', '#b9c2c4', { label: 'Tower cladding (profiled sheet)' });
const structure = param('structure', '#e0a526', { label: 'Structure, ladder and rails (paint)' });
const gallery = param('gallery', '#5d7f8c', { label: 'Gallery cladding' });
const belts = param('belts', '#24272a', { label: 'Belts (rubber)' });

presets({
  plant: { cladding: '#b9c2c4', structure: '#e0a526', gallery: '#5d7f8c', belts: '#24272a' },
  weathered: { cladding: '#9a9690', structure: '#8a7a52', gallery: '#6e6a62', belts: '#2c2a28' },
  highVisibility: { cladding: '#e2e4e2', structure: '#f0c419', gallery: '#2f6b8f', belts: '#1c1d1e' },
  oxide: { cladding: '#8a3a2c', structure: '#3a3d40', gallery: '#b9c2c4', belts: '#24272a' },
});

const p = assembly("conveyor-transfer-tower");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const barXZ = (x0: number, z0: number, x1: number, z1: number, y: number, d: number, t: number) => {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(len, d, t, true).rotateY(-a).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};
const rodYZ = (y0: number, z0: number, y1: number, z1: number, x: number, t: number) => {
  const len = Math.hypot(y1 - y0, z1 - z0);
  const a = (Math.atan2(z1 - z0, y1 - y0) * 180) / Math.PI;
  return box(t, len, t, true).rotateX(a).translate(x, (y0 + y1) / 2, (z0 + z1) / 2);
};

// Tower body: square clad box on corner columns.
const TH = 1400, TZ = 6000;
add("tower-body", blk(0, 0, 0, 2 * TH, 2 * TH, TZ).color(cladding));
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(`column-${sx < 0 ? 'l' : 'r'}${sy < 0 ? 'f' : 'b'}`, blk(sx * TH, sy * TH, 0, 200, 200, TZ + 100).color(structure));
add("plinth", blk(0, 0, 0, 2 * TH + 300, 2 * TH + 300, 200).color('#a39f96'));
for (const z of [2000, 4000]) add(`girt-${z}`, blk(0, -TH - 30, z, 2 * TH, 60, 120).color(structure));
// Profiled-sheet ribs on the two faces the camera sees.
for (let k = 0; k < 9; k++) {
  const c = -1100 + k * 275;
  add(`rib-front-${k}`, blk(c, -TH - 15, 200, 50, 30, TZ - 200).color(cladding));
  add(`rib-side-${k}`, blk(-TH - 15, c, 200, 30, 50, 3300).color(cladding));
}
// Mono-pitch roof, roof vent and louvre band.
add("roof", box(2 * TH + 400, 2 * TH + 400, 120, true).rotateX(-6).translate(0, 0, TZ + 160).color(structure));
add("roof-vent", cylinder(500, 260, 14).translate(400, 300, TZ + 150).color(cladding));
add("roof-vent-cap", cylinder(80, 380, 14).translate(400, 300, TZ + 720).color(structure));
for (const s of [-1, 1]) add(`roof-vent-stay-${s < 0 ? 'a' : 'b'}`, blk(400 + s * 250, 300, TZ + 640, 30, 30, 90).color(structure));
add("louvre-frame", blk(-600, -TH - 20, 4800, 1100, 40, 760).subtract(blk(-600, -TH - 40, 4860, 980, 80, 640)).color(structure));
for (let k = 0; k < 6; k++) add(`louvre-${k}`, box(980, 140, 20, true).rotateX(35).translate(-600, -TH - 40, 4910 + k * 105).color('#3a3d40'));

// Inclined clad gallery arriving at the -X wall from a tail house.
const GX0 = -9000, GZ0 = 2100, GX1 = -TH, GZ1 = 4900, GW = 1700, GH = 1900;
const tanA = (GZ1 - GZ0) / (GX1 - GX0);
const gz = (x: number) => GZ0 + (x - GX0) * tanA;
const under = (x: number) => gz(x) - GH / 2 / Math.cos(Math.atan(tanA));
add("gallery-shell", barXZ(GX0, GZ0, GX1 + 60, GZ1 + 60 * tanA, 0, GW, GH).color(gallery));
add("gallery-roof-trim", barXZ(GX0, GZ0 + GH / 2 + 20, GX1, GZ1 + GH / 2 + 20, 0, GW + 120, 50).color(structure));
add("gallery-windows", barXZ(GX0 + 700, GZ0 + 700 * tanA + 250, GX1 - 500, GZ1 - 500 * tanA + 250, -GW / 2 - 6, 14, 280).color('#2a3a44'));
for (let k = 0; k < 7; k++) {
  const x = GX0 + 500 + k * 1100;
  add(`gallery-frame-${k}`, box(90, GW + 40, GH + 40, true).rotateY(-Math.atan(tanA) * 180 / Math.PI).translate(x, 0, gz(x)).color(structure));
}
add("gallery-collar", blk(-TH - 80, 0, GZ1 - GH / 2 - 150, 160, GW + 300, GH + 300).color(structure));
// Tail house at the low end.
add("tail-house", blk(GX0 - 500, 0, 0, 1600, GW + 300, GZ0 + GH / 2 + 200).color(cladding));
add("tail-house-roof", blk(GX0 - 500, 0, GZ0 + GH / 2 + 200, 1800, GW + 500, 100).color(structure));
add("tail-house-door", blk(GX0 - 600, -GW / 2 - 156, 0, 900, 12, 2100).color(gallery));
// Braced trestle under the middle of the gallery.
const TX = -5200, TZt = under(TX);
for (const s of [-1, 1]) {
  for (const dx of [-300, 300]) add(`trestle-leg-${s < 0 ? 'f' : 'b'}-${dx < 0 ? 'a' : 'b'}`, blk(TX + dx, s * 750, 0, 160, 160, under(TX + dx)).color(structure));
  add(`trestle-foot-${s < 0 ? 'f' : 'b'}`, blk(TX, s * 750, 0, 1000, 450, 200).color('#a39f96'));
}
for (const dx of [-300, 300]) {
  add(`trestle-brace-${dx < 0 ? 'a' : 'b'}-1`, rodYZ(-750, 250, 750, TZt - 300, TX + dx, 90).color(structure));
  add(`trestle-brace-${dx < 0 ? 'a' : 'b'}-2`, rodYZ(750, 250, -750, TZt - 300, TX + dx, 90).color(structure));
}
add("trestle-head", blk(TX, 0, TZt - 300, 800, GW + 100, 160).color(structure));

// Outgoing open conveyor at the base, leaving through the +X wall.
const OZ = 1100, OX1 = 7200;
add("out-belt", blk((TH + OX1) / 2, 0, OZ, OX1 - TH, 900, 14).color(belts));
for (let k = 0; k < 9; k++) add(`out-load-${k}`, sphere(220).scale([1.6, 1.2, 0.5]).translate(TH + 500 + k * 600, (k % 3 - 1) * 90, OZ + 20).color(['#9a8f7a', '#8a7f68', '#a89a7c'][k % 3]));
for (const s of [-1, 1]) add(`out-stringer-${s < 0 ? 'f' : 'b'}`, blk((TH + OX1) / 2, s * 520, OZ - 180, OX1 - TH, 80, 170).color(structure));
add("out-head-pulley", cylinder(1000, 230, 14).rotateX(90).translate(OX1, 500, OZ - 230).color(structure));
add("out-drive", blk(OX1, -700, OZ - 380, 400, 400, 400).color('#3a5c8a'));
for (const x of [2600, 4400, 6400]) {
  for (const s of [-1, 1]) add(`out-leg-${x}-${s < 0 ? 'f' : 'b'}`, blk(x, s * 520, 0, 100, 100, OZ - 180).color(structure));
  add(`out-leg-tie-${x}`, blk(x, 0, 400, 80, 1100, 80).color(structure));
}
add("out-walkway", blk((TH + OX1) / 2, -820, OZ - 260, OX1 - TH, 500, 40).color('#7d8285'));
for (const x of [2600, 4400, 6400]) add(`out-rail-post-${x}`, blk(x, -1050, OZ - 220, 50, 50, 1100).color(structure));
add("out-rail", blk((TH + OX1) / 2, -1050, OZ + 820, OX1 - TH, 50, 50).color(structure));

// Personnel door with steps on the front face.
add("door-frame", blk(-600, -TH - 20, 200, 1100, 40, 2300).color(structure));
add("door", blk(-600, -TH - 30, 260, 960, 30, 2180).color(gallery));
add("door-handle", blk(-250, -TH - 60, 1250, 40, 40, 160).color('#1c1d1e'));
for (let k = 0; k < 2; k++) add(`step-${k}`, blk(-600, -TH - 300 + k * 120, 0, 1300, 360 - k * 120, 100 + k * 100).color('#a39f96'));
add("door-sign", blk(-600, -TH - 34, 2050, 600, 8, 160).color('#2f7a46'));

// Caged ladder up the front to a railed landing at gallery level.
const LX = 800, LY = -TH - 260, LZ = 4300;
for (const s of [-1, 1]) add(`ladder-stile-${s < 0 ? 'l' : 'r'}`, blk(LX + s * 230, LY, 0, 50, 50, LZ + 1100).color(structure));
for (let k = 0; k < 15; k++) add(`ladder-rung-${k}`, blk(LX, LY, 300 + k * 290, 460, 30, 30).color(structure));
for (let k = 0; k < 6; k++) {
  const z = 2300 + k * 400;
  add(`cage-hoop-${k}`, blk(LX, LY - 420, z, 760, 50, 50).union(blk(LX - 355, LY - 210, z, 50, 470, 50)).union(blk(LX + 355, LY - 210, z, 50, 470, 50)).color(structure));
}
for (const dx of [-355, 0, 355]) add(`cage-strap-${dx < 0 ? 'l' : dx > 0 ? 'r' : 'c'}`, blk(LX + dx, LY - (dx === 0 ? 420 : 210), 2300, 40, 40, LZ - 2300).color(structure));
for (const z of [1500, 3000]) add(`ladder-bracket-${z}`, blk(LX, -TH - 130, z, 500, 260, 50).color(structure));
add("landing", blk(LX - 200, -TH - 450, LZ, 1600, 900, 60).color('#7d8285'));
for (const x of [LX - 950, LX - 350, LX + 550]) add(`landing-post-${x}`, blk(x, -TH - 880, LZ + 60, 50, 50, 1100).color(structure));
add("landing-rail", blk(LX - 200, -TH - 880, LZ + 1110, 1600, 50, 50).color(structure));
add("landing-midrail", blk(LX - 200, -TH - 880, LZ + 600, 1600, 40, 40).color(structure));
add("landing-door", blk(LX - 300, -TH - 20, LZ + 60, 800, 30, 1500).color(gallery));

return p.model();
