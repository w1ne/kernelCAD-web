// SPDX-License-Identifier: CC0-1.0
// Stage edge trim: the finished front corner of a platform stage, with the
// edge nosing, glow strip and pleated skirt that dress a raw deck edge.
// What makes it stage edge trim rather than a box: a rounded aluminium
// bullnose nosing screwed along the deck edge and returned round the corner,
// a photoluminescent glow strip on the nosing so performers can find the
// edge in a blackout, a pleated velour skirt hanging from skirt clips down to
// the floor on both faces, and a white safety line painted back from the edge.
// Generic visualization geometry at about real size (1.5 m front, 0.6 m
// return, 600 mm stage height), millimetres, Z up, front toward -Y, skirt
// hem on z = 0.

meta({
  name: "stage-edge-trim",
  license: 'CC0-1.0',
  title: "Stage edge trim",
  description: "Finished front corner of a 600 mm platform stage at about real size: rounded aluminium bullnose nosing screwed along the deck edge and returned round the corner, a photoluminescent glow strip along the nosing, pleated velour skirting hung on clips down to the floor on both faces, and a painted safety line back from the edge. Material controls: stage deck, nosing, glow strip, skirt velour. houseShow, touring and gala presets.",
  tags: ['stage edge', 'stage nosing', 'stage skirt', 'stage skirting', 'glow tape', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 3500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const deck = param('deck', '#2a2b2e', { label: 'Stage deck' });
const nosing = param('nosing', '#b9c0c4', { label: 'Aluminium nosing' });
const glow = param('glow', '#c9e86a', { label: 'Glow strip' });
const skirt = param('skirt', '#1e1f23', { label: 'Skirt velour' });

presets({
  houseShow: { deck: '#2a2b2e', nosing: '#b9c0c4', glow: '#c9e86a', skirt: '#1e1f23' },
  touring: { deck: '#7a5a3a', nosing: '#2e3236', glow: '#e6d24a', skirt: '#1c1d20' },
  gala: { deck: '#1c1d1f', nosing: '#c8a45a', glow: '#d8ef8a', skirt: '#6b1f2a' },
});

const p = assembly("stage-edge-trim");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) outline extruded `t` long along X, centred on x = 0.
const profileYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const X0 = -750; // corner (left end of the front)
const X1 = 750;
const Y0 = -300; // deck front face
const Y1 = 300;
const ZS = 600; // stage top

// Deck slab with its edge frame.
add("deck", blk(0, 0, ZS - 40, X1 - X0, Y1 - Y0, 40).color(deck));
add("deck-frame-front", blk(0, Y0 + 20, ZS - 140, X1 - X0, 40, 100).color(deck));
add("deck-frame-left", blk(X0 + 20, 20, ZS - 140, 40, Y1 - Y0 - 40, 100).color(deck));
add("safety-line", blk((X0 + 65 + X1 - 60) / 2, Y0 + 90, ZS, X1 - X0 - 125, 50, 1).color('#e8e6e0'));
add("safety-line-return", blk(X0 + 90, (Y0 + 115 + Y1 - 60) / 2, ZS, 50, Y1 - Y0 - 175, 1).color('#e8e6e0'));

// Bullnose nosing: top flange on the deck, rounded nose over the edge and a
// short drop leg down the face. Built for the front (along X) and turned for
// the left return (along Y).
const nose: number[][] = [[0, 0], [60, 0], [60, 6], [-8, 6]];
for (let k = 1; k <= 6; k++) {
  const a = (k / 6) * Math.PI / 2;
  nose.push([-8 - 22 * Math.sin(a), 6 - 22 * (1 - Math.cos(a))]);
}
nose.push([-30, -70], [-24, -70], [-24, -16], [0, -16]);
const run = (len: number) => profileYZ(nose.map(([y, z]) => [y, z]), len);
add("nosing-front", run(X1 - X0).translate(0, Y0, ZS).color(nosing));
add("nosing-left", run(Y1 - Y0).rotateZ(-90).translate(X0, 0, ZS).color(nosing));
add("nosing-corner", cylinder(76, 30, 16).translate(X0, Y0, ZS - 70).color(nosing));

// Glow strip on the nose of the front and the return.
add("glow-front", blk(0, Y0 + 4, ZS + 6, X1 - X0, 14, 2).color(glow));
add("glow-left", blk(X0 + 4, 0, ZS + 6, 14, Y1 - Y0, 2).color(glow));
add("glow-corner", cylinder(2, 12, 12).translate(X0 + 2, Y0 + 2, ZS + 6).color(glow));

// Countersunk screws along the nosing flange.
for (let i = 0; i < 6; i++) add(`screw-f-${i}`, cylinder(1, 6, 8).translate(X0 + 150 + i * 250, Y0 + 40, ZS + 6).color('#6a7076'));
for (let i = 0; i < 2; i++) add(`screw-l-${i}`, cylinder(1, 6, 8).translate(X0 + 40, Y0 + 180 + i * 250, ZS + 6).color('#6a7076'));

// Pleated velour skirt on both faces: zigzag outline plus an offset copy,
// extruded from the floor up to the nosing drop leg.
const SH = ZS - 80;
const pleats = (a: number, b: number, n: number, off: number) => {
  const step = (b - a) / n;
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([a + i * step, (i % 2 === 0 ? -16 : 16) + off]);
  return pts;
};
const cloth = (a: number, b: number, n: number) => [...pleats(a, b, n, 0), ...pleats(a, b, n, 6).reverse()];
add("skirt-front", extrudePolygon(cloth(X0 - 66, X1, 38), SH).translate(0, Y0 - 50, 0).color(skirt));
// Return skirt: same pleats laid out along Y, then turned to the left face.
add("skirt-left", extrudePolygon(cloth(Y0 - 34, Y1, 16), SH).rotateZ(90).translate(X0 - 50, 0, 0).color(skirt));

// Skirt clips hooked over the nosing drop leg.
for (let i = 0; i < 5; i++) add(`clip-f-${i}`, blk(X0 + 150 + i * 300, Y0 - 40, SH - 10, 30, 22, 40).color('#2e3236'));
for (let i = 0; i < 2; i++) add(`clip-l-${i}`, blk(X0 - 40, Y0 + 150 + i * 300, SH - 10, 22, 30, 40).color('#2e3236'));

return p.model();
