// A roofed park-slide tower on four posts, with a raised deck, guarded sides,
// a raked rung ladder and a U-trough chute ending at a supported run-out. The
// tower, ladder, roof and continuous slide path make the playground equipment
// recognizable in the default preview. Millimetres, Z up, ladder at -X, chute
// toward +X.

meta({
  name: 'playground-slide',
  license: 'CC0-1.0',
  title: 'Playground slide',
  description: 'Roofed playground slide tower with ladder, deck, side rails and a supported U-trough chute. Knobs: roof presence, galvanized steel, HDPE deck, stainless-steel slide and roof-polyethylene colours.',
  tags: ['slide', 'playground', 'play equipment', 'kids', 'park', 'ladder', 'tower', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'park', 'playground'],
  triangleBudget: 480,
});

const roofed = param('roofed', 'yes', { choices: ['yes', 'no'], label: 'Roof' });
const galvanizedSteel = param('galvanizedSteel', '#8d969e', { label: 'Galvanized steel' });
const hdpe = param('hdpe', '#2a7fc8', { label: 'HDPE deck' });
const stainlessSteel = param('stainlessSteel', '#c4c7ca', { label: 'Stainless-steel slide' });
const roofPolyethylene = param('roofPolyethylene', '#c8352b', { label: 'Roof polyethylene' });

presets({
  park: { galvanizedSteel: '#2f7d4a', hdpe: '#e7c78e', stainlessSteel: '#e8432e', roofPolyethylene: '#f2c418' },
  coastal: { galvanizedSteel: '#455a64', hdpe: '#d8d4c9', stainlessSteel: '#2a7fc8', roofPolyethylene: '#f2f1ea' },
});

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Straight bar in the XZ plane at depth y, from (x0, z0) to (x1, z1), square section t.
const bar = (x0: number, z0: number, x1: number, z1: number, t: number, y = 0) => {
  const len = Math.hypot(x1 - x0, z1 - z0) + t;
  const a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(len, t, t, true).rotateY(-a).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};
// Side-profile prism: points are (y, z), thickness t along X from x0.
const sideProfile = (pts: [number, number][], x0: number, t: number) =>
  extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0, 0, 0);
// Elevation prism: points are (x, z), extruded w along Y centred on y = 0.
const elev = (pts: [number, number][], w: number) => extrudePolygon(pts, w).translate(0, 0, -w / 2).rotateX(90);

const ox = -780;
const dz = 1500;
const ps = assembly('playground-slide');
const place = (s: Shape) => s.translate(ox, 0, 0);
const addSteel = (name: string, s: Shape) => ps.part(name, place(s).color(galvanizedSteel));
const addHdpe = (name: string, s: Shape) => ps.part(name, place(s).color(hdpe));
const addStainless = (name: string, s: Shape) => ps.part(name, place(s).color(stainlessSteel));
const addCanopy = (name: string, s: Shape) => ps.part(name, place(s).color(roofPolyethylene));
for (const [k, [px, py]] of [[-1, -1], [1, -1], [-1, 1], [1, 1]].entries()) {
  addSteel(`post-${k + 1}`, blk(px * 450 - 40, py * 450 - 40, 0, px * 450 + 40, py * 450 + 40, roofed.value === 'yes' ? 2500 : 2200));
}
addHdpe('deck', blk(-450, -450, dz - 50, 450, 450, dz));
for (const side of [-1, 1]) {
  addSteel(`rail-${side < 0 ? 'l' : 'r'}`, blk(-450, side * 450 - 20, 2100, 450, side * 450 + 20, 2150));
  addSteel(`rail-mid-${side < 0 ? 'l' : 'r'}`, blk(-450, side * 450 - 20, 1800, 450, side * 450 + 20, 1840));
  addSteel(`ladder-rail-${side < 0 ? 'l' : 'r'}`, bar(-1285, 35, -450, dz, 50, side * 280));
}
for (let r = 1; r <= 4; r++) {
  const z = (dz * r) / 5;
  const x = -1300 + (850 * z) / dz;
  addSteel(`rung-${r}`, blk(x - 30, -280, z - 20, x + 30, 280, z + 20));
}
if (roofed.value === 'yes') {
  addCanopy('roof', elev([[-600, 2480], [600, 2480], [0, 2900]], 1100));
}
// Chute: a U-trough laid along +X, tilted down and hung off the deck edge.
const a = 33;
const drop = dz - 250;
const len = drop / Math.sin((a * Math.PI) / 180);
const run = len * Math.cos((a * Math.PI) / 180);
const trough: [number, number][] = [[-300, 0], [300, 0], [300, 180], [260, 180], [260, 40], [-260, 40], [-260, 180], [-300, 180]];
addStainless('chute', sideProfile(trough, 0, len).rotateY(a).translate(440, 0, dz - 20));
addStainless('run-out', sideProfile(trough, 430 + run - 30, 520).translate(0, 0, 250 - 20 - 25));
addSteel('run-out-leg', blk(430 + run + 380, -200, 0, 430 + run + 460, 200, 210));

return ps.model();
