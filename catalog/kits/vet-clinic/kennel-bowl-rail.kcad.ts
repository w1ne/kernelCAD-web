// SPDX-License-Identifier: CC0-1.0
// Kennel feeding bowl rail: a row of flared stainless dog bowls hanging in
// wire holder rings off a steel rail. Two slotted uprights on floor plates let
// staff pin the rail at the right height for each dog. Each bowl is a hollow
// revolved dish with a rolled rim, so from above it reads as a bowl you can
// fill, not a puck. Bowls lift out of their rings for washing.
// Generic visualization geometry at real size, millimetres, Z up, floor plates
// on z = 0, the rail runs along X with the bowls on the -Y side.
meta({
  name: "kennel-bowl-rail",
  license: 'CC0-1.0',
  title: "Kennel feeding bowl rail",
  description: "Height-adjustable kennel feeding rail: two slotted uprights on floor plates carrying a steel rail with wire holder rings and lift-out flared stainless bowls with rolled rims. Material controls: powder-coated steel, stainless bowls, wire holders, rubber feet. Bowl-count choice; clinicClean and softTeal presets.",
  tags: ["veterinary", "animal clinic", "animal health", "kennel", "feeding", "bowl", "rail", "dog", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const bowls = param('bowls', 'three', { choices: ['two', 'three', 'four'], label: 'Bowl count' });
const paintedSteelColor = param('paintedSteelColor', '#58737a', { label: 'Powder-coated steel' });
const stainlessSteelColor = param('stainlessSteelColor', '#c7d0ce', { label: 'Stainless bowls' });
const holderColor = param('holderColor', '#2f3a3d', { label: 'Wire bowl holders' });
const rubberColor = param('rubberColor', '#22292b', { label: 'Rubber feet' });

presets({
  clinicClean: { paintedSteelColor: '#e4ebe7', stainlessSteelColor: '#d9e0de', holderColor: '#8a9a9c', rubberColor: '#4b5558' },
  softTeal: { paintedSteelColor: '#4d858d', stainlessSteelColor: '#b9c7c5', holderColor: '#24494e', rubberColor: '#1e2a2c' },
});

const p = assembly("kennel-bowl-rail");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Round polygon of n points.
const circle = (r, n = 16) => Array.from({ length: n }, (_, i) => {
  const t = ((i + 0.5) / n) * Math.PI * 2;
  return [r * Math.cos(t), r * Math.sin(t)];
});
// Round rod from p0 to p1.
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

// Slotted uprights on floor plates.
const xPost = 600;
for (const s of [-1, 1]) {
  const side = s < 0 ? 'left' : 'right';
  let post = box(44, 44, 720, true).translate(s * xPost, 0, 372);
  for (let i = 0; i < 7; i += 1) post = post.subtract(box(50, 16, 40, true).translate(s * xPost, 0, 160 + i * 70));
  add(`upright-${side}`, post.color(paintedSteelColor));
  add(`upright-cap-${side}`, box(50, 50, 10, true).translate(s * xPost, 0, 737).color(rubberColor));
  add(`floor-plate-${side}`, box(130, 220, 10, true).translate(s * xPost, -50, 13).color(paintedSteelColor));
  add(`foot-front-${side}`, box(130, 30, 8, true).translate(s * xPost, -145, 4).color(rubberColor));
  add(`foot-rear-${side}`, box(130, 30, 8, true).translate(s * xPost, 45, 4).color(rubberColor));
  add(`rail-clamp-${side}`, box(64, 60, 160, true).translate(s * xPost, 0, 300).color(holderColor));
  add(`clamp-pin-${side}`, rod([s * xPost, -34, 300], [s * xPost, 34, 300], 7, 8).color(stainlessSteelColor));
}

// Rail: a back plate with folded top and bottom lips.
add('rail-plate', box(2 * xPost, 10, 130, true).translate(0, -30, 300).color(paintedSteelColor));
add('rail-lip-top', box(2 * xPost, 34, 10, true).translate(0, -42, 360).color(paintedSteelColor));
add('rail-lip-bottom', box(2 * xPost, 34, 10, true).translate(0, -42, 240).color(paintedSteelColor));

// Flared stainless bowl: hollow revolved dish with a rolled rim, bottom at z = 0.
const bowl = () =>
  path()
    .moveTo(0, 0).lineTo(84, 0).lineTo(90, 6).lineTo(118, 64).lineTo(130, 68).lineTo(130, 74)
    .lineTo(118, 72).lineTo(108, 66).lineTo(82, 10).lineTo(0, 10).close()
    .revolve();
const xs = { two: [-260, 260], three: [-380, 0, 380], four: [-435, -145, 145, 435] }[bowls.value];
const yBowl = -200;
const zBowl = 250;
xs.forEach((x, i) => {
  const n = i + 1;
  add(`bowl-${n}`, bowl().translate(x, yBowl, zBowl).color(stainlessSteelColor));
  // Wire ring hugging the bowl wall just below the rim, on two arms back to the rail.
  const ring = extrudePolygon(circle(126, 18), 8).subtract(extrudePolygon(circle(114, 18), 10).translate(0, 0, -1));
  add(`holder-ring-${n}`, ring.translate(x, yBowl, zBowl + 50).color(holderColor));
  add(`holder-arm-${n}-a`, rod([x - 55, -36, 300], [x - 55, yBowl + 108, zBowl + 54], 5).color(holderColor));
  add(`holder-arm-${n}-b`, rod([x + 55, -36, 300], [x + 55, yBowl + 108, zBowl + 54], 5).color(holderColor));
});

return p.model();
