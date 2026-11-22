// SPDX-License-Identifier: CC0-1.0
// Hanging wayfinding sign: the double-sided aisle marker that hangs over a
// supermarket aisle. What makes it an aisle sign rather than a board: an
// extruded aluminium frame with rounded ends, a printed face with a big
// aisle-number roundel, two lines of category lettering and a direction
// arrow, and the same print on the back face. It hangs from two steel
// wires with turnbuckles and ceiling clips, and the panel's bottom edge
// sits at z = 0 so it can be dropped onto a ceiling height. Generic
// visualization geometry at about real size (1.6 m wide), millimetres,
// Z up, front on -Y.

meta({
  name: "hanging-wayfinding-sign",
  license: 'CC0-1.0',
  title: "Hanging wayfinding sign",
  description: "Double-sided overhead aisle sign at about real size: rounded aluminium frame, printed faces with an aisle-number roundel, two lines of category lettering and a direction arrow, hung from two steel wires with turnbuckles and ceiling clips. Material controls: frame, sign face, lettering, roundel accent. freshMarket, discountStore and organicGrocer presets; arrow direction choice.",
  tags: ['aisle sign', 'wayfinding', 'hanging sign', 'ceiling sign', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#b8c1c4', { label: 'Aluminium frame' });
const face = param('face', '#1f5f8b', { label: 'Sign face' });
const lettering = param('lettering', '#f4f2ea', { label: 'Lettering' });
const accent = param('accent', '#f2b632', { label: 'Number roundel' });
const arrow = param('arrow', 'right', { choices: ['right', 'left'], label: 'Arrow direction' });

presets({
  freshMarket: { frame: '#b8c1c4', face: '#1f5f8b', lettering: '#f4f2ea', accent: '#f2b632' },
  discountStore: { frame: '#3a3f44', face: '#e2231a', lettering: '#ffffff', accent: '#ffd400' },
  organicGrocer: { frame: '#8a6a45', face: '#e9e1cc', lettering: '#2f5a32', accent: '#7aa13d' },
});

const p = assembly("hanging-wayfinding-sign");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

const W = 1600;
const H = 400;
const T = 50;
const R = H / 2;

// Stadium-shaped frame: straight top and bottom with half-round ends.
const stadium = (w: number, r: number, z0: number) => {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI;
    pts.push([w / 2 - r + r * Math.cos(a), z0 + r + r * Math.sin(a)]);
  }
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI;
    pts.push([-w / 2 + r + r * Math.cos(a), z0 + r + r * Math.sin(a)]);
  }
  return pts;
};
add("frame", profileXZ(stadium(W, R, 0), T).color(frame));

// Printed faces, front and back, with roundel, lettering and arrow.
const dir = arrow.value === 'left' ? -1 : 1;
const arrowPts = [[0, 60], [110, 0], [0, -60], [0, -26], [-120, -26], [-120, 26], [0, 26]].map(([x, z]) => [dir * x, z]);
for (const [k, s] of [['front', -1], ['back', 1]]) {
  const y = s * (T / 2 + 2);
  const mirror = -s; // keep the print readable from each side
  add(`face-${k}`, profileXZ(stadium(W - 40, R - 20, 20), 4).translate(0, y, 0).color(face));
  const yd = s * (T / 2 + 6);
  add(`roundel-${k}`, cylinder(6, 150, 24).rotateX(90).translate(mirror * -(W / 2 - 200), s < 0 ? -29 : 35, R).color(accent));
  add(`digit-${k}`, profileXZ([[-55, 90], [60, 90], [60, 60], [0, -95], [-38, -95], [18, 60], [-55, 60]].map(([x, z]) => [mirror * x, z]), 6).translate(mirror * -(W / 2 - 200), yd + s * 6, R).color(face));
  const x0 = mirror * -(W / 2 - 400);
  const words = [[0, 250, 300], [330, 170, 300], [0, 200, 150], [230, 120, 150], [380, 150, 150]];
  for (const [i, [dx, w, z]] of words.entries()) {
    const hgt = z > 200 ? 60 : 38;
    add(`word-${k}-${i}`, blk(x0 + mirror * (dx + w / 2), yd, z - hgt / 2, w, 4, hgt).color(lettering));
  }
  add(`arrow-${k}`, profileXZ(arrowPts.map(([x, z]) => [mirror * x, z]), 6).translate(mirror * (W / 2 - 220), yd, R).color(lettering));
}

// Suspension: wire eyes on the frame top, wires, turnbuckles and ceiling clips.
const WIRE = 900;
for (const [k, x] of [['l', -W / 2 + 260], ['r', W / 2 - 260]]) {
  add(`eye-${k}`, torus(22, 6, 12).rotateX(90).translate(x, 0, H + 18).color(frame));
  add(`wire-lo-${k}`, cylinder(380, 3, 6).translate(x, 0, H + 38).color('#8e9699'));
  add(`turnbuckle-${k}`, cylinder(90, 10, 8).translate(x, 0, H + 418).color('#5d6468'));
  add(`wire-hi-${k}`, cylinder(WIRE - 508, 3, 6).translate(x, 0, H + 508).color('#8e9699'));
  add(`clip-${k}`, blk(x, 0, H + WIRE, 60, 40, 30).color('#5d6468'));
  add(`ceiling-plate-${k}`, cylinder(10, 50, 16).translate(x, 0, H + WIRE + 30).color(frame));
}

return p.model();
