// SPDX-License-Identifier: CC0-1.0
// Concert xylophone on a rolling frame.
// What makes it a xylophone rather than a row of slats: two keyboard rows of
// rosewood bars laid out like a piano, naturals in front and the raised
// accidentals behind, each bar arched underneath and graduated from long
// bass bars to short treble bars, a resonator tube hanging under every bar
// that shortens with pitch, and the bars resting on cord rails over a
// steel A-frame stand on rubber casters. A pair of mallets lies on the bars.
// Generic visualization geometry at real size (about 1.15 m long, 0.9 m
// tall), millimetres, Z up, low notes at -X, player at -Y, floor on z = 0.
meta({
  name: 'xylophone',
  license: 'CC0-1.0',
  title: 'Xylophone',
  description: 'Concert xylophone at real size: piano-layout rows of arched rosewood bars, naturals in front and raised accidentals behind, graduated from bass to treble, a resonator tube under every bar shortening with pitch, cord rails on a steel A-frame stand with rubber casters, and a pair of mallets. Material controls: rosewood bars, brass resonators, steel frame, rubber casters and mallet heads. Concert, vintage and synthetic-bar presets.',
  tags: ['xylophone', 'mallet percussion', 'resonator', 'percussion', 'music', 'instrument', 'orchestra', 'low poly', 'CC0'],
  kit: 'music',
  category: 'prop',
  origin: 'base',
  compat: ['music', 'orchestra', 'stage', 'indoor'],
  triangleBudget: 3600
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const rosewood = param('rosewood', '#945631', { label: 'Rosewood bars' });
const brass = param('brass', '#c9a24a', { label: 'Brass resonators' });
const steel = param('steel', '#39444a', { label: 'Steel frame and rails' });
const rubber = param('rubber', '#c23a2c', { label: 'Rubber casters and mallet heads' });

presets({
  concert: { rosewood: '#b16b39' },
  vintage: { rosewood: '#633c2c', brass: '#a8843f', steel: '#4a3f36' },
  synthetic: { rosewood: '#3b2a26', brass: '#b9c3c7', steel: '#1f2427', rubber: '#e2b23a' },
});

const p = assembly('xylophone');
const add = (name, shape) => p.part(name, shape.scale(scale));

const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Bar of length l (along Y), width w (along X), arched underneath.
const bar = (l, w, t) => {
  const a = Math.min(10, t * 0.45);
  const pts = [[-l / 2, 0], [-l / 4, 0], [-l / 8, a], [l / 8, a], [l / 4, 0], [l / 2, 0], [l / 2, t], [-l / 2, t]];
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [y, z] of pts.slice(1)) pb = pb.lineTo(y, z);
  // Local (x, y, z) -> world (y, z, x).
  return pb.close().extrude(w).rotateX(90).rotateZ(90).translate(-w / 2, 0, 0);
};

const naturals = 22;
const pitch = 50;
const X0 = -((naturals - 1) * pitch) / 2;
const NY = -120;
const AY = 150;
const NZ = 830;
const AZ = 858;
const t = 22;
const barLen = (i) => 360 - (150 * i) / (naturals - 1);

// Naturals in front; accidentals over the gaps behind (C# D# . F# G# A# .).
const keys = [];
for (let i = 0; i < naturals; i += 1) {
  keys.push({ name: `natural-${String(i + 1).padStart(2, '0')}`, x: X0 + i * pitch, y: NY, z: NZ, l: barLen(i), r: 24 });
  const note = i % 7;
  if (note !== 2 && note !== 6 && i < naturals - 1) {
    keys.push({ name: `sharp-${String(i + 1).padStart(2, '0')}`, x: X0 + (i + 0.5) * pitch, y: AY, z: AZ, l: barLen(i + 0.5) - 20, r: 22 });
  }
}
for (const k of keys) {
  add(k.name, bar(k.l, 40, t).translate(k.x, k.y, k.z).color(rosewood));
  // Resonator hangs under the bar; tube length falls with pitch.
  const len = 70 + (k.l - 200) * 2.6;
  add(`resonator-${k.name}`, extrudePolygon(circle(k.r, 8), len).translate(k.x, k.y, k.z - 30 - len).color(brass));
}

// Cord rails under each row, converging with the shorter treble bars.
const XA = X0 - 40;
const XB = X0 + (naturals - 1) * pitch + 40;
for (const [y, z, l0, l1] of [[NY, NZ, barLen(0), barLen(naturals - 1)], [AY, AZ, barLen(0.5) - 20, barLen(naturals - 1.5) - 20]]) {
  for (const s of [-1, 1]) {
    add(`rail-${y}-${s}`, rod([XA, y + s * (l0 / 2 - 45), z - 6], [XB, y + s * (l1 / 2 - 45), z - 6], 7).color(steel));
  }
}
// Resonator hanger bars under each row.
for (const [y, z] of [[NY, NZ], [AY, AZ]]) {
  add(`hanger-${y}`, box(XB - XA, 12, 12, true).translate((XA + XB) / 2, y, z - 26).color(steel));
}

// A-frame ends with casters and a low stretcher.
for (const x of [XA - 20, XB + 20]) {
  for (const y of [-260, 300]) {
    add(`leg-${x}-${y}`, rod([x, y * 0.85, 60], [x, y * 0.45, NZ - 20], 14).color(steel));
    add(`caster-${x}-${y}`, extrudePolygon(circle(28, 8), 26).rotateX(90).translate(x, y * 0.85 + 13, 28).color(rubber));
    add(`caster-fork-${x}-${y}`, box(30, 34, 34, true).translate(x, y * 0.85, 66).color(steel));
  }
  add(`end-rail-${x}`, rod([x, -170, NZ - 20], [x, 180, NZ - 20], 14).color(steel));
  add(`end-foot-${x}`, rod([x, -221, 82], [x, 255, 82], 12).color(steel));
}
add('stretcher', rod([XA - 20, 17, 200], [XB + 20, 17, 200], 14).color(steel));

// Two mallets resting on the naturals.
for (const [i, dy] of [[6, -10], [9, 25]]) {
  const x = X0 + i * pitch;
  add(`mallet-shaft-${i}`, rod([x - 30, NY - 200 + dy, NZ + t + 8], [x + 40, NY + 80 + dy, NZ + t + 14], 4).color(rosewood));
  add(`mallet-head-${i}`, sphere(19).translate(x + 48, NY + 96 + dy, NZ + t + 14).color(rubber));
}

return p.model();
