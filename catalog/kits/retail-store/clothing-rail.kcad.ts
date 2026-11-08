// SPDX-License-Identifier: CC0-1.0
// Clothing rail: the rolling chrome garment rack used on a fashion floor.
// What makes it a garment rail rather than a frame: a round top bar on
// two telescopic uprights with clamp collars, splayed base legs on
// swivel castors, a wire shelf for folded stock between the feet, and a
// row of shirts and dresses hung on hook hangers along the bar. Generic
// visualization geometry at about real size (1.5 m long, 1.6 m to the
// bar), millimetres, Z up, bar along X, front on -Y.

meta({
  name: "clothing-rail",
  license: 'CC0-1.0',
  title: "Clothing rail",
  description: "Rolling chrome garment rail at about real size: round top bar on telescopic uprights with clamp collars, splayed base legs on swivel castors, a wire base shelf with folded stock, and a row of shirts and dresses on hook hangers. Material controls: chrome frame, castors, main garment colour, second garment colour. boutiqueNeutral, summerBright and denimStore presets; load choice.",
  tags: ['clothing rail', 'garment rack', 'clothes rack', 'fashion', 'apparel', 'retail', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const chrome = param('chrome', '#c9d0d4', { label: 'Chrome frame' });
const castors = param('castors', '#26292c', { label: 'Castors' });
const fabricA = param('fabricA', '#d9c7a7', { label: 'Main garment fabric' });
const fabricB = param('fabricB', '#3b4f6b', { label: 'Second garment fabric' });
const load = param('load', 'garments', { choices: ['garments', 'empty'], label: 'Load' });

presets({
  boutiqueNeutral: { chrome: '#c9d0d4', castors: '#26292c', fabricA: '#d9c7a7', fabricB: '#3b4f6b' },
  summerBright: { chrome: '#e3e6e8', castors: '#f4f1ea', fabricA: '#f29a7a', fabricB: '#4fb3bf' },
  denimStore: { chrome: '#2e3134', castors: '#1a1c1e', fabricA: '#4a6a96', fabricB: '#b8463a' },
});

const p = assembly("clothing-rail");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
const profileXZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

const HX = 700;
const BAR = 1600;
const CR = 38;
const LEGZ = CR * 2 + 10;

for (const s of [-1, 1]) {
  const tag = s < 0 ? 'l' : 'r';
  const x = s * HX;
  // Splayed base legs (an H foot) on four castors.
  add(`base-leg-${tag}`, rod([x, -260, LEGZ], [x, 260, LEGZ], 14, 10).color(chrome));
  for (const y of [-260, 260]) {
    const ft = `${tag}${y < 0 ? 'f' : 'b'}`;
    add(`castor-fork-${ft}`, blk(x, y, CR, 36, 30, LEGZ - CR + 10).color(chrome));
    add(`castor-${ft}`, cylinder(26, CR, 14).rotateY(90).translate(x - 13, y, CR - 2).subtract(blk(x, y, -20, 60, 100, 20)).color(castors));
  }
  // Telescopic upright: thick lower tube, thinner upper tube, clamp collar.
  add(`upright-low-${tag}`, rod([x, 0, LEGZ], [x, 0, 1000], 18, 12).color(chrome));
  add(`upright-high-${tag}`, rod([x, 0, 1000], [x, 0, BAR], 13, 12).color(chrome));
  add(`collar-${tag}`, cylinder(50, 24, 12).translate(x, 0, 960).color(castors));
  add(`collar-knob-${tag}`, rod([x, 0, 985], [x, -50, 985], 8, 8).color(castors));
  add(`bar-elbow-${tag}`, sphere(16).translate(x, 0, BAR).color(chrome));
}
add("top-bar", rod([-HX, 0, BAR], [HX, 0, BAR], 14, 12).color(chrome));
add("base-cross-bar", rod([-HX, 0, LEGZ + 20], [HX, 0, LEGZ + 20], 12, 10).color(chrome));

// Wire base shelf between the feet.
for (const y of [-180, 180]) add(`shelf-rail-${y < 0 ? 'f' : 'b'}`, rod([-HX, y, LEGZ + 40], [HX, y, LEGZ + 40], 6, 6).color(chrome));
for (let i = 0; i < 9; i++) add(`shelf-wire-${i}`, blk(-HX + 70 + i * 170, 0, LEGZ + 34, 6, 370, 6).color(chrome));

if (load.value === 'garments') {
  // Folded stock on the shelf.
  for (let i = 0; i < 3; i++) add(`folded-${i}`, blk(-420 + i * 380, 0, LEGZ + 46, 320, 260, 60 + (i % 2) * 40).color(i % 2 ? fabricB : fabricA));
  // Shirts and dresses on hook hangers, flat garments facing -Y.
  const shirt = [[-70, 20], [-170, 0], [-270, -180], [-210, -240], [-150, -170], [-150, -620], [150, -620], [150, -170], [210, -240], [270, -180], [170, 0], [70, 20]];
  const dress = [[-70, 20], [70, 20], [120, -60], [100, -300], [230, -900], [-230, -900], [-100, -300], [-120, -60]];
  // Hook over the bar: a half-ring outline plus a straight stem down to the hanger.
  const arcPts = (r: number) => Array.from({ length: 9 }, (_, j) => [r * Math.cos((Math.PI * j) / 8), r * Math.sin((Math.PI * j) / 8)]);
  const hook = [...arcPts(22), [-18, -40], [-14, -40], ...arcPts(18).reverse().slice(0, 8), [18, -4], [22, -4]];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const x = -HX + 140 + i * ((2 * HX - 280) / (n - 1));
    const isDress = i % 3 === 2;
    const col = i % 2 ? fabricB : fabricA;
    const yaw = -55 + (i % 2) * 6;
    const g = profileXZ(isDress ? dress : shirt, 30).translate(0, 0, BAR - 90);
    add(`garment-${i}`, g.rotateZ(yaw).translate(x, 0, 0).color(col));
    add(`hanger-bar-${i}`, profileXZ([[-200, -6], [200, -6], [0, 60]], 8).translate(0, 0, BAR - 90).rotateZ(yaw).translate(x, 0, 0).color('#8a5a3a'));
    add(`hanger-hook-${i}`, profileXZ(hook, 6).rotateZ(yaw).translate(x, 0, BAR).color(chrome));
    if (!isDress) add(`collar-${i}`, profileXZ([[-70, 20], [70, 20], [0, -70]], 34).translate(0, 0, BAR - 90).rotateZ(yaw).translate(x, 0, 0).color('#f4f1ea'));
  }
}

return p.model();
