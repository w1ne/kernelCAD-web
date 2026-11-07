// SPDX-License-Identifier: CC0-1.0
// Bench-mounted articulated extraction arm ("snorkel") for local fume capture.
// What makes it a snorkel rather than a desk lamp: a 75 mm extraction duct
// that rises from a flanged bench mount into a swivel, then two straight arm
// tubes joined by chunky friction knuckles with tension knobs, ending in a
// clear flared bell hood that hangs over the work, with a damper on the stem.
// Generic visualization geometry at real size (about 0.85 m tall, 1.2 m reach),
// millimetres, Z up, bench top on z = 0, arm reaching along +X.
meta({
  name: 'articulated-extraction-snorkel',
  license: 'CC0-1.0',
  title: 'Articulated extraction snorkel',
  description: 'Bench-mounted fume extraction arm: flanged mount with swivel and damper, two aluminium arm tubes joined by friction knuckles with tension knobs, clamp collars, and a clear flared bell hood. Material controls: joint enamel, arm tube aluminium, mount steel, hood acrylic, knob polymer. Reaching or folded pose; cleanroom and high-visibility presets.',
  tags: ['fume extraction arm', 'snorkel', 'extraction arm', 'local exhaust ventilation', 'laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const pose = param('pose', 'reaching', { choices: ['reaching', 'folded'], label: 'Arm pose' });
const enamel = param('enamel', '#f1f3f0', { label: 'Knuckle and swivel enamel' });
const stainless = param('stainless', '#c7d0d3', { label: 'Arm tube aluminium' });
const steel = param('steel', '#53666e', { label: 'Bench mount and damper steel' });
const acrylic = param('acrylic', '#8fd0dc', { label: 'Bell hood acrylic' });
const knob = param('knob', '#d9482b', { label: 'Tension knob polymer' });
presets({
  cleanroom: { enamel: '#e7f0ed', stainless: '#d0d9d8', steel: '#75888d', acrylic: '#bfe6ea', knob: '#23a5a2' },
  highVisibility: { enamel: '#f0f2e8', stainless: '#6f8488', steel: '#33464d', acrylic: '#ffe36b', knob: '#1f2a30' },
});

const p = assembly('articulated-extraction-snorkel');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Turn a +Z-pointing shape to point along `d`, then move it to `at`.
const orient = (shape, d, at) => {
  const len = Math.hypot(d[0], d[1], d[2]);
  return shape
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(at[0], at[1], at[2]);
};
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0, p1, r, n = 12) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  return orient(extrudePolygon(circle(r, n), Math.hypot(d[0], d[1], d[2])), d, p0);
};
const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

// Joint positions: swivel J1 on the stem, elbow J2, hood mouth H.
const J1 = [0, 0, 430];
const J2 = pose.value === 'reaching' ? [520, 0, 780] : [250, 0, 1005];
const H = pose.value === 'reaching' ? [920, 0, 260] : [390, 0, 395];

// Flanged bench mount, stem, damper and swivel.
add('bench-flange', turned([[0, 0], [130, 0], [130, 14], [60, 30], [0, 30]]).color(steel));
add('stem', rod([0, 0, 20], [0, 0, J1[2] - 40], 40, 14).color(stainless));
add('damper-body', turned([[0, 0], [48, 0], [48, 60], [0, 60]]).translate(0, 0, 160).color(steel));
add('damper-lever', box(110, 14, 10, true).translate(55, 0, 190).color(knob));
add('swivel-collar', turned([[0, 0], [56, 0], [56, 26], [46, 36], [0, 36]]).translate(0, 0, J1[2] - 60).color(enamel));

// Knuckle: two cheeks around a horizontal pivot along Y, with a tension knob.
const knuckle = (tag, at) => {
  add(`${tag}-cheek-a`, turned([[0, 0], [62, 0], [62, 26], [0, 26]]).rotateX(90).translate(at[0], at[1] + 52, at[2]).color(enamel));
  add(`${tag}-cheek-b`, turned([[0, 0], [62, 0], [62, 26], [0, 26]]).rotateX(-90).translate(at[0], at[1] - 52, at[2]).color(enamel));
  add(`${tag}-hub`, rod([at[0], at[1] - 30, at[2]], [at[0], at[1] + 30, at[2]], 50, 14).color(enamel));
  add(`${tag}-knob`, turned([[0, 0], [24, 0], [38, 14], [38, 30], [30, 38], [0, 38]]).rotateX(90).translate(at[0], at[1] - 52, at[2]).color(knob));
};
knuckle('swivel-knuckle', J1);
knuckle('elbow-knuckle', J2);

// Arm tubes with clamp collars at each end.
add('upper-arm', rod(J1, J2, 38).color(stainless));
add('lower-arm', rod(J2, lerp(J2, H, 0.82), 38).color(stainless));
for (const [tag, a, b] of [['upper', J1, J2], ['lower', J2, H]]) {
  for (const [i, u] of (tag === 'upper' ? [0.15, 0.85] : [0.15, 0.7]).entries()) {
    add(`${tag}-collar-${i}`, rod(lerp(a, b, u), lerp(a, b, u + 0.06), 46).color(enamel));
  }
}

// Clear flared bell hood hanging at the end of the lower arm.
const hood = turned([
  [36, 160], [44, 160], [52, 120], [150, 12], [170, 0], [168, -10], [142, 0], [44, 110], [36, 120],
]);
add('bell-hood', orient(hood, [J2[0] - H[0], J2[1] - H[1], J2[2] - H[2]], H).color(acrylic));
add('hood-rim', orient(turned([[160, -14], [176, -14], [176, 4], [160, 4]]), [J2[0] - H[0], J2[1] - H[1], J2[2] - H[2]], H).color(enamel));

return p.model();
