// SPDX-License-Identifier: CC0-1.0
// Magazine rack: the stepped press stand by a supermarket's front tills.
// What makes it a magazine rack rather than a bookcase: four tiers that
// step back as they rise, each a back-leaning pocket with a clear acrylic
// front lip, so every magazine shows its whole cover; covers carry a
// masthead band and a cover photo block; staircase side cheeks; a kick
// plinth on glides and a "press" header on top. Generic visualization
// geometry at about real size (0.75 m wide, 1.55 m tall), millimetres,
// Z up, front on -Y.

meta({
  name: "magazine-rack",
  license: 'CC0-1.0',
  title: "Magazine rack",
  description: "Stepped supermarket press stand at about real size: four tiers of back-leaning pockets with clear acrylic front lips, magazines showing masthead bands and cover photos, staircase side cheeks, kick plinth on glides and a header card. Material controls: frame, acrylic lip, cover colours A and B. newsstandOak, modernWhite and nightShift presets.",
  tags: ['magazine rack', 'press stand', 'newspaper rack', 'literature display', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#8a6440', { label: 'Frame (oak or steel)' });
const acrylic = param('acrylic', '#bcd9de', { label: 'Acrylic lip' });
const coverA = param('coverA', '#c8323a', { label: 'Cover colour A' });
const coverB = param('coverB', '#2f6fb0', { label: 'Cover colour B' });

presets({
  newsstandOak: { frame: '#8a6440', acrylic: '#bcd9de', coverA: '#c8323a', coverB: '#2f6fb0' },
  modernWhite: { frame: '#e8ecee', acrylic: '#cfe4e8', coverA: '#e86a2f', coverB: '#3a8f5a' },
  nightShift: { frame: '#2b3136', acrylic: '#7fa6b0', coverA: '#d8b13a', coverB: '#8e3a8a' },
});

const p = assembly("magazine-rack");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 750;
const LEAN = -16;
const tiers = [[-200, 140], [-110, 470], [-20, 800], [70, 1130]];
const YB = 230;

// Kick plinth on glides.
for (const [k, x, y] of [['lf', -1, -1], ['rf', 1, -1], ['lb', -1, 1], ['rb', 1, 1]]) {
  add(`glide-${k}`, cylinder(15, 20, 10).translate(x * (W / 2 - 40), y * 180 + 20, 0).color('#1a1c1e'));
}
add("plinth", blk(0, 15, 15, W - 30, 450, 100).color(frame));

// Staircase side cheeks following the tier fronts.
const cheek = [[-230, 15], [YB, 15], [YB, 1520]];
for (const [y, z] of [...tiers].reverse()) cheek.push([y - 20, z + 210], [y - 20, z - 20]);
cheek.push([-230, 115]);
for (const [k, x] of [['l', -W / 2 + 10], ['r', W / 2 - 10]]) add(`cheek-${k}`, profileYZ(cheek, 20).translate(x, 0, 0).color(frame));
add("back", blk(0, YB - 9, 115, W - 40, 18, 1405).color(frame));

// Each pocket is built upright at the origin, then leaned back about its bottom-front edge.
const lean = (s: Shape, y: number, z: number) => s.rotateX(LEAN).translate(0, y, z);
tiers.forEach(([y, z], t) => {
  add(`pocket-floor-${t}`, blk(0, y + 40, z - 12, W - 40, 110, 12).color(frame));
  add(`pocket-back-${t}`, lean(blk(0, 60, 0, W - 40, 12, 300), y, z).color(frame));
  // Three magazines side by side, alternating cover colours.
  for (let i = 0; i < 3; i++) {
    const x = -232 + i * 232;
    const c = (i + t) % 2 ? coverB : coverA;
    const alt = (i + t) % 2 ? coverA : coverB;
    add(`mag-${t}-${i}`, lean(blk(x, 30, 0, 210, 14, 280), y, z).color(c));
    add(`masthead-${t}-${i}`, lean(blk(x, 21, 225, 196, 4, 44), y, z).color('#f4f2ea'));
    add(`photo-${t}-${i}`, lean(blk(x + 20, 21, 70, 140, 4, 130), y, z).color(alt));
    add(`barcode-${t}-${i}`, lean(blk(x - 70, 21, 18, 44, 4, 30), y, z).color('#f4f2ea'));
  }
  // Clear acrylic lip across the front.
  add(`lip-${t}`, blk(0, y - 6, z - 12, W - 40, 8, 110).color(acrylic));
  add(`lip-edge-${t}`, blk(0, y - 6, z + 94, W - 40, 10, 6).color('#e9f3f5'));
});

// Header card across the top of the cheeks.
add("header", blk(0, YB - 30, 1520, W, 24, 150).color(frame));
add("header-panel", blk(0, YB - 44, 1540, W - 80, 6, 110).color('#f4f2ea'));
add("header-word", blk(-60, YB - 49, 1570, 360, 4, 50).color(coverA));
add("header-dot", cylinder(4, 38, 16).rotateX(90).translate(220, YB - 47, 1595).color(coverB));

return p.model();
