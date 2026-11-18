// SPDX-License-Identifier: CC0-1.0
// Veterinary exam step stool: the two-step stool staff use to reach a raised
// exam or surgery table. Two raked tubular side frames splay out to rubber
// feet. A low front tread and a higher rear tread are stainless pans with
// ribbed rubber mats and an anti-slip nosing strip on the leading edge. An
// optional handrail rises from the rear legs. Staggered treads on splayed
// tube legs are what make it a step stool and not a crate.
// Generic visualization geometry at real size, millimetres, Z up, feet on
// z = 0, users climb from the -Y side.
meta({
  name: "exam-step-stool",
  license: 'CC0-1.0',
  title: "Veterinary exam step stool",
  description: "Two-step exam stool: raked tubular steel side frames on rubber feet, a low front tread and higher rear tread as stainless pans with ribbed rubber mats and anti-slip nosing, cross braces, and an optional rear handrail. Material controls: powder-coated tube, stainless treads, rubber mats and feet, anti-slip nosing. Handrail choice; clinicClean and softTeal presets.",
  tags: ["veterinary", "animal clinic", "animal health", "exam", "step", "stool", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const handrail = param('handrail', 'rail', { choices: ['rail', 'none'], label: 'Handrail' });
const paintedSteelColor = param('paintedSteelColor', '#4f6f7c', { label: 'Powder-coated tube' });
const stainlessSteelColor = param('stainlessSteelColor', '#c3ccca', { label: 'Stainless treads' });
const rubberColor = param('rubberColor', '#2b3234', { label: 'Rubber mats and feet' });
const nosingColor = param('nosingColor', '#e2b53a', { label: 'Anti-slip nosing' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7', stainlessSteelColor: '#d6dddb', rubberColor: '#4a5558', nosingColor: '#7fb7a6' },
  softTeal: { paintedSteelColor: '#4d858d', stainlessSteelColor: '#b4c1bf', rubberColor: '#26363a', nosingColor: '#f0d27a' },
});

const p = assembly("exam-step-stool");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Round polygon of n points.
const circle = (r, n = 8) => Array.from({ length: n }, (_, i) => {
  const t = ((i + 0.5) / n) * Math.PI * 2;
  return [r * Math.cos(t), r * Math.sin(t)];
});
// Round tube from p0 to p1.
const tube = (p0, p1, r = 12, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Leg position at height z along a raked leg from foot f to top t.
const along = (f, t, z) => {
  const u = (z - f[2]) / (t[2] - f[2]);
  return [f[0] + (t[0] - f[0]) * u, f[1] + (t[1] - f[1]) * u, z];
};

// Side frames: splayed front and rear legs, a top rail under the upper tread
// and a side rail under the lower tread.
const zLow = 210;
const zHigh = 420;
for (const s of [-1, 1]) {
  const side = s < 0 ? 'left' : 'right';
  const frontFoot = [s * 245, -320, 20];
  const frontTop = [s * 215, -40, zHigh - 14];
  const rearFoot = [s * 250, 210, 20];
  const rearTop = [s * 215, 150, zHigh - 14];
  add(`front-leg-${side}`, tube(frontFoot, frontTop).color(paintedSteelColor));
  add(`rear-leg-${side}`, tube(rearFoot, rearTop).color(paintedSteelColor));
  add(`top-rail-${side}`, tube(frontTop, rearTop).color(paintedSteelColor));
  add(`low-rail-${side}`, tube([s * 225, -330, zLow - 14], along(rearFoot, rearTop, zLow - 14)).color(paintedSteelColor));
  add(`low-strut-${side}`, tube([s * 225, -330, zLow - 14], [s * 245, -320, 20]).color(paintedSteelColor));
  for (const [tag, f] of [['front', [s * 245, -320]], ['rear', rearFoot]]) {
    add(`foot-${tag}-${side}`, extrudePolygon(circle(19, 10), 22).translate(f[0], f[1], 0).color(rubberColor));
  }
}
// Cross braces tying the two side frames together.
add('brace-rear-low', tube([-242, 196, 120], [242, 196, 120], 10).color(paintedSteelColor));
add('brace-front-low', tube([-225, -330, zLow - 14], [225, -330, zLow - 14], 10).color(paintedSteelColor));
add('brace-mid', tube([-216, -40, zHigh - 14], [216, -40, zHigh - 14], 10).color(paintedSteelColor));

// Treads: stainless pans with ribbed rubber mats and a nosing strip at the front.
const tread = (tag, y0, y1, z) => {
  const d = y1 - y0;
  const yc = (y0 + y1) / 2;
  add(`${tag}-pan`, box(480, d, 6, true).translate(0, yc, z).color(stainlessSteelColor));
  add(`${tag}-skirt`, box(480, 6, 40, true).translate(0, y0 - 3, z - 17).color(stainlessSteelColor));
  add(`${tag}-mat`, box(440, d - 50, 4, true).translate(0, yc + 15, z + 5).color(rubberColor));
  for (let i = 0; i < 5; i += 1) {
    add(`${tag}-rib-${i + 1}`, box(440, 8, 5, true).translate(0, y0 + 50 + i * ((d - 70) / 4), z + 9).color(rubberColor));
  }
  add(`${tag}-nosing`, box(480, 26, 4, true).translate(0, y0 + 13, z + 5).color(nosingColor));
};
tread('lower-tread', -345, -110, zLow);
tread('upper-tread', -70, 175, zHigh);

// Optional handrail rising from the rear legs.
if (handrail.value === 'rail') {
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'left' : 'right';
    add(`rail-post-${side}`, tube([s * 215, 150, zHigh - 14], [s * 215, 170, 920]).color(paintedSteelColor));
    add(`rail-grip-${side}`, tube([s * 215, 170, 820], [s * 215, 170, 920], 16).color(rubberColor));
  }
  add('rail-bar', tube([-227, 170, 920], [227, 170, 920]).color(paintedSteelColor));
}

return p.model();
