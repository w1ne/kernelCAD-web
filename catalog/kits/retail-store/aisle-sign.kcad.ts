// SPDX-License-Identifier: CC0-1.0
// Aisle sign: the double-sided panel hung over a supermarket aisle. What
// makes it an aisle sign rather than a board: a rounded aluminium frame
// round a white acrylic face, a coloured number block with the aisle
// number, category "words" in bold lettering under a coloured header
// band, a direction chevron, and two drop rods to ceiling clamps that
// leave it floating above head height. Both faces are printed. Generic
// visualization geometry at about real size (1.2 m wide, 420 mm tall
// panel, 1.1 m drop), millimetres, Z up, face on -Y. The bottom of the
// frame sits at z = 0.

meta({
  name: "aisle-sign",
  license: 'CC0-1.0',
  title: "Aisle sign",
  description: "Double-sided hanging aisle sign at about real size: rounded aluminium frame, white acrylic face, coloured aisle-number block with a big 7, category lettering under a header band, a direction chevron, and two drop rods to ceiling clamps. Material controls: frame, face, category accent, lettering. produce, frozen and bakery presets; arrow choice.",
  tags: ['aisle sign', 'hanging sign', 'wayfinding', 'supermarket', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#a9b3b8', { label: 'Aluminium frame and rods' });
const face = param('face', '#f6f5ef', { label: 'Acrylic face' });
const accent = param('accent', '#2f9e52', { label: 'Category accent' });
const lettering = param('lettering', '#26302c', { label: 'Lettering' });
const arrow = param('arrow', 'right', { choices: ['right', 'left', 'none'], label: 'Direction arrow' });

presets({
  produce: { frame: '#a9b3b8', face: '#f6f5ef', accent: '#2f9e52', lettering: '#26302c' },
  frozen: { frame: '#c9d1d6', face: '#eef5fa', accent: '#2f6fc1', lettering: '#1b2a3a' },
  bakery: { frame: '#5a4a3c', face: '#f7eedc', accent: '#d27a2c', lettering: '#3b2a1e' },
});

const p = assembly("aisle-sign");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
// Rounded rectangle outline in (x, z), bottom edge on z = z0.
const roundRect = (w: number, h: number, r: number, z0 = 0, n = 4) => {
  const pts = [];
  const corners = [[w / 2 - r, z0 + r, -90], [w / 2 - r, z0 + h - r, 0], [-w / 2 + r, z0 + h - r, 90], [-w / 2 + r, z0 + r, 180]];
  for (const [cx, cz, a0] of corners) {
    for (let i = 0; i <= n; i++) {
      const a = ((a0 + (90 * i) / n) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
  }
  return pts;
};

const W = 1200;
const H = 420;
const T = 34;
const DROP = 1100;

// Frame, face and the two printed sides.
add("frame", profileXZ(roundRect(W, H, 50), T).subtract(profileXZ(roundRect(W - 36, H - 36, 34, 18), T + 10)).color(frame));
add("face", profileXZ(roundRect(W - 36, H - 36, 34, 18), T - 8).color(face));
const digit7 = [[-80, 0], [-30, 0], [55, 200], [55, 230], [-85, 230], [-85, 190], [10, 190]];
const chevron = [[0, 0], [70, 70], [0, 140], [-40, 140], [30, 70], [-40, 0]];
for (const side of [-1, 1]) {
  const s = side < 0 ? 'f' : 'b';
  const yFace = side * (T / 2 - 4);
  const lay = (pts, t: number, x: number, z: number) => profileXZ(pts.map(([u, v]) => [side < 0 ? u : -u, v]), t).translate(side < 0 ? x : -x, yFace + side * t / 2, z);
  add(`number-block-${s}`, lay(roundRect(300, H - 36, 34, 0), 4, -W / 2 + 168, 18).color(accent));
  add(`number-${s}`, lay(digit7, 6, -W / 2 + 168, 95).color(face));
  add(`header-band-${s}`, lay(roundRect(W - 380, 90, 20, 0), 4, 150, H - 130).color(accent));
  // Category words as letter-height bars of word-like lengths.
  const words = [[[-250, 170], [-50, 230], [210, 150]], [[-250, 120], [-100, 150], [80, 210]]];
  words.forEach((row, ri) => row.forEach(([xl, len], wi) => {
    add(`word-${s}-${ri}-${wi}`, lay(roundRect(len, 56, 10, 0), 6, xl + len / 2, 180 - ri * 110).color(lettering));
  }));
  add(`header-text-${s}`, lay(roundRect(380, 34, 10, 0), 6, 150, H - 102).color(face));
  if (arrow.value !== 'none') {
    const pts = arrow.value === 'right' ? chevron : chevron.map(([u, v]) => [-u, v]);
    add(`arrow-${s}`, lay(pts, 6, W / 2 - 110, 140).color(accent));
  }
}

// Drop rods with clamps on the frame top and ceiling plates.
for (const [k, x] of [['l', -400], ['r', 400]]) {
  add(`clamp-${k}`, blk(x, 0, H - 10, 70, T + 16, 40).color(frame));
  add(`rod-${k}`, cylinder(DROP - H - 30, 7, 10).translate(x, 0, H + 30).color(frame));
  add(`turnbuckle-${k}`, cylinder(70, 13, 10).translate(x, 0, H + 260).color(lettering));
  add(`ceiling-plate-${k}`, blk(x, 0, DROP - 20, 140, 140, 20).color(frame));
  add(`ceiling-clip-${k}`, blk(x, 0, DROP - 50, 50, 50, 30).color(frame));
}

return p.model();
