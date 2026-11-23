// SPDX-License-Identifier: CC0-1.0
// Concert pedal harp.
// What makes it a pedal harp rather than a triangle: a tall fluted column
// with a carved crown, an S-curved "harmonic curve" neck carrying a row of
// brass tuning discs, and a tapered soundbox leaning back from the pedestal
// with a pale spruce soundboard down its string face. The strings fan down
// from the neck to the soundboard, longest at the column, with the red C and
// dark F strings a harpist reads by, and seven brass pedals sit at the base.
// Generic visualization geometry at real size (about 1.85 m tall),
// millimetres, Z up, strings in the XZ plane, floor on z = 0.
meta({
  name: 'concert-harp',
  license: 'CC0-1.0',
  title: 'Concert harp',
  description: 'Concert pedal harp at real size: fluted column with a carved crown, S-curved neck with brass tuning discs, tapered soundbox with a spruce soundboard, a fan of strings with red C and dark F marker strings, and seven brass pedals on the pedestal. Material controls: maple frame, spruce soundboard, brass fittings, gut strings, C and F marker strings. Concert, vintage and gilded presets.',
  tags: ['concert harp', 'pedal harp', 'harp', 'strings', 'music', 'instrument', 'orchestra', 'low poly', 'CC0'],
  kit: 'music',
  category: 'prop',
  origin: 'base',
  compat: ['music', 'orchestra', 'stage', 'indoor'],
  triangleBudget: 3600
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const maple = param('maple', '#c19151', { label: 'Maple frame' });
const spruce = param('spruce', '#e8cf9a', { label: 'Spruce soundboard' });
const brass = param('brass', '#c79a3b', { label: 'Brass discs, crown and pedals' });
const gut = param('gut', '#efe4c8', { label: 'Gut strings' });
const cString = param('cString', '#c2322e', { label: 'C marker strings' });
const fString = param('fString', '#26304a', { label: 'F marker strings' });

presets({
  concert: { maple: '#d5a562', spruce: '#f0dcae' },
  vintage: { maple: '#855331', spruce: '#c9a66a', brass: '#9c7a3a', gut: '#dccfa8' },
  gilded: { maple: '#d9b45a', spruce: '#efe0b8', brass: '#e2bd52', cString: '#b4262a', fString: '#1d2a44' },
});

const p = assembly('concert-harp');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Closed polygon in the XZ plane, given as (x, z), extruded `t` thick about y = 0.
const sideSlab = (pts, t) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, z] of pts.slice(1)) pb = pb.lineTo(x, z);
  return pb.close().extrude(t).rotate([1, 0, 0], 90).translate(0, t / 2, 0);
};
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
// Round bar from p0 to p1.
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
const rect = (w, d, c) => path()
  .moveTo(-w / 2 + c, -d / 2).lineTo(w / 2 - c, -d / 2).lineTo(w / 2, -d / 2 + c).lineTo(w / 2, d / 2 - c)
  .lineTo(w / 2 - c, d / 2).lineTo(-w / 2 + c, d / 2).lineTo(-w / 2, d / 2 - c).lineTo(-w / 2, -d / 2 + c).close();

// Pedestal with feet and seven pedals (three left, four right) facing the player.
add('pedestal', sideSlab([[-120, 30], [380, 30], [400, 70], [380, 120], [-100, 120], [-130, 80]], 360).color(maple));
for (const [x, y] of [[-90, -150], [-90, 150], [350, -150], [350, 150]]) {
  add(`foot-${x}-${y}`, turned([[0, 0], [34, 0], [40, 14], [30, 30], [0, 30]]).translate(x, y, 0).color(brass));
}
for (const [i, y] of [-160, -115, -70, 60, 100, 140, 180].entries()) {
  add(`pedal-${i + 1}`, box(120, 22, 14, true).translate(-170, y * 0.9, 44 + (i % 2) * 18).color(brass));
}

// Soundbox: a ruled taper leaning back from the pedestal to the neck.
const A = [150, 120];
const B = [-420, 1490];
const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
const lean = (Math.atan2(B[0] - A[0], B[1] - A[1]) * 180) / Math.PI;
const box0 = rect(250, 330, 70).loft([rect(95, 120, 26)], {
  planes: [
    { plane: 'XY' as const, origin: [0, 0, 0] as [number, number, number] },
    { plane: 'XY' as const, origin: [0, 0, L] as [number, number, number] },
  ],
  ruled: true,
});
add('soundbox', box0.rotateY(lean).translate(A[0], 0, A[1]).color(maple));
const board = rect(18, 300, 8).loft([rect(18, 100, 6)], {
  planes: [
    { plane: 'XY' as const, origin: [0, 0, 30] as [number, number, number] },
    { plane: 'XY' as const, origin: [0, 0, L - 20] as [number, number, number] },
  ],
  ruled: true,
});
// Soundboard sits on the string face; depth tapers 250 -> 95, so offset by half.
const tanTaper = (250 - 95) / 2 / L;
const boardTilt = (Math.atan(tanTaper) * 180) / Math.PI;
add('soundboard', board.rotateY(-boardTilt).translate(125 - 4, 0, 0).rotateY(lean).translate(A[0], 0, A[1]).color(spruce));
// Point on the soundboard face at fraction t from the foot.
const ux = Math.sin((lean * Math.PI) / 180);
const uz = Math.cos((lean * Math.PI) / 180);
const boardAt = (t) => {
  const half = 125 - ((250 - 95) / 2) * t + 6;
  return [A[0] + ux * L * t + uz * half, A[1] + uz * L * t - ux * half];
};
// Three sound-hole rims down the back of the soundbox.
for (const t of [0.2, 0.42, 0.64]) {
  const half = 125 - ((250 - 95) / 2) * t;
  const x = A[0] + ux * L * t - uz * half;
  const z = A[1] + uz * L * t + ux * half;
  add(`sound-hole-rim-${Math.round(t * 100)}`, turned([[0, 0], [70 - 30 * t, 0], [70 - 30 * t, 10], [0, 10]]).rotateY(lean - 90).translate(x, 0, z).color(brass));
}

// S-curved neck (harmonic curve) from soundbox head to column crown.
const N0 = -470;
const N1 = 300;
const neckZ = (x) => {
  const t = (x - N0) / (N1 - N0);
  return 1530 + 190 * t + 55 * Math.sin(2 * Math.PI * t);
};
const lower = [];
const upper = [];
for (let i = 0; i <= 16; i += 1) {
  const x = N0 + ((N1 - N0) * i) / 16;
  lower.push([x, neckZ(x)]);
  upper.push([x, neckZ(x) + 115 - 25 * Math.sin(Math.PI * i / 16)]);
}
add('neck', sideSlab([...lower, ...upper.reverse()], 64).color(maple));

// Fluted column with plinth and carved crown.
const CX = 300;
add('column-plinth', turned([[0, 0], [70, 0], [70, 30], [56, 50], [50, 90], [0, 90]]).translate(CX, 0, 110).color(brass));
add('column-shaft', turned([[0, 0], [48, 0], [40, 1460], [0, 1460]]).translate(CX, 0, 200).color(maple));
for (let i = 0; i < 8; i += 1) {
  const a = (2 * Math.PI * i) / 8;
  add(`flute-${i}`, rod([CX + 47 * Math.cos(a), 47 * Math.sin(a), 260], [CX + 40 * Math.cos(a), 40 * Math.sin(a), 1600], 5, 4).color(brass));
}
add('crown', turned([[0, 0], [52, 0], [78, 50], [86, 110], [60, 140], [40, 175], [0, 175]]).translate(CX, 0, 1660).color(brass));
add('crown-finial', turned([[0, 0], [28, 0], [34, 22], [18, 50], [0, 60]]).translate(CX, 0, 1835).color(maple));

// Strings from soundboard to neck, with tuning discs; every 7th is C (red), F (dark).
const count = 30;
for (let i = 0; i < count; i += 1) {
  const t = 0.08 + (0.86 * i) / (count - 1);
  const [x, z] = boardAt(1 - t);
  const top = neckZ(x) - 6;
  const note = (count - 1 - i) % 7;
  const ink = note === 0 ? cString : note === 3 ? fString : gut;
  add(`string-${String(i + 1).padStart(2, '0')}`, rod([x, 0, z], [x, 0, top], ink === gut ? 2.5 : 3.5, 4).color(ink));
  add(`disc-${String(i + 1).padStart(2, '0')}`, turned([[0, 0], [9, 0], [9, 5], [0, 5]]).rotateX(90).translate(x, -34, top - 18).color(brass));
}

return p.model();
