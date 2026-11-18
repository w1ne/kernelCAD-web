// SPDX-License-Identifier: CC0-1.0
// Cast-iron kettlebell: what makes it one is the cannonball body on a flat
// base with the handle cast in one piece on top — two thick horns rising from
// the shoulders and bending over into a round grip bar, leaving a window big
// enough for a hand. A painted colour band marks the weight, a raised plate
// carries the number, and a rubber ring protects the floor. Generic
// visualization geometry at about real size (a 16 kg bell is about 210 mm
// across and 280 mm tall), millimetres, Z up, base on z = 0.
meta({
  name: 'kettlebell',
  license: 'CC0-1.0',
  title: 'Kettlebell',
  description: "Cast-iron kettlebell at about real size: cannonball body on a flat base, one-piece horns and round grip bar, painted weight-colour band, raised weight plate with markings and a rubber floor ring. The weight choice (8-32 kg) sizes the bell as cast iron does. Material controls: cast iron body, handle finish, weight colour band, base rubber; competition, powderCoat and weathered presets.",
  tags: ['kettlebell', 'free weights', 'gym', 'training', 'cast iron', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const weight = param('weight', '16kg', { choices: ['8kg', '12kg', '16kg', '24kg', '32kg'], label: 'Weight' });
const castIron = param('castIron', '#2d3236', { label: 'Cast iron body' });
const handleSteel = param('handleSteel', '#4a5257', { label: 'Handle finish' });
const weightBand = param('weightBand', '#e2b733', { label: 'Weight colour band' });
const baseRubber = param('baseRubber', '#1c1e20', { label: 'Base rubber' });
presets({
  competition: { castIron: '#e2b733', handleSteel: '#aab4b7', weightBand: '#f4f2ea' },
  powderCoat: { castIron: '#3f687f', handleSteel: '#3f687f', weightBand: '#e8e6df' },
  weathered: { castIron: '#4f4740', handleSteel: '#6b6158', weightBand: '#a7883e', baseRubber: '#3a3835' },
});

const p = assembly('kettlebell');
// Cast-iron bells grow with the cube root of their mass (16 kg is the reference).
const kg = { '8kg': 8, '12kg': 12, '16kg': 16, '24kg': 24, '32kg': 32 }[weight.value];
const k = Math.cbrt(kg / 16);
const add = (name, shape) => p.part(name, shape.scale(k).scale(scale));

const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const R = 105;           // body radius
const CZ = 112;          // body centre height
// Body: a sphere flattened into a base at the bottom and a shoulder at the top.
const bodyProfile = [[0, CZ - R * Math.sin((66 * Math.PI) / 180)]];
for (let d = -66; d <= 62; d += 8) {
  const a = (d * Math.PI) / 180;
  bodyProfile.push([R * Math.cos(a), CZ + R * Math.sin(a)]);
}
bodyProfile.push([0, CZ + R * Math.sin((62 * Math.PI) / 180)]);
add('body', turned(bodyProfile).color(castIron));
// Rubber floor ring on the flat base.
add('base-ring', turned([[R * 0.3, 0], [R * 0.44, 0], [R * 0.44, 18], [R * 0.3, 18]]).color(baseRubber));
// Painted weight band round the equator.
add('weight-band', turned([[0, CZ - 14], [R + 1.5, CZ - 14], [R + 1.5, CZ + 14], [0, CZ + 14]]).color(weightBand));
// Raised weight plate on the front, with two bars standing in for the number.
add('weight-plate', extrudePolygon(filletPolygon([[-30, -22], [30, -22], [30, 22], [-30, 22]], 8), 8).rotateX(90).translate(0, -R + 6, CZ + 42).color(weightBand));
for (const [i, x] of [-12, 12].entries()) add(`weight-mark-${i + 1}`, box(10, 4, 28, true).translate(x, -R - 3, CZ + 42).color(castIron));

// Handle: two horns rising from the shoulders, bending over into a round grip.
const HX = 64;           // horn spacing (half)
const SHOULDER = CZ + 72;
const GRIP_Z = 272;      // grip bar centre
const BAR_R = 17;        // bar radius
const BEND = 30;         // bend radius from horn to grip
for (const sx of [-1, 1]) {
  // Horn: a tapering post from the shoulder up to the start of the bend.
  add(`horn-${sx < 0 ? 'left' : 'right'}`, turned([[0, 0], [BAR_R + 8, 0], [BAR_R + 1, 30], [BAR_R, GRIP_Z - BEND - SHOULDER], [0, GRIP_Z - BEND - SHOULDER]])
    .translate(sx * HX, 0, SHOULDER).color(handleSteel));
  // Bend: a quarter torus (in the XZ plane) turning the horn inward into the grip bar.
  const quarter = box(BEND + BAR_R + 2, 2 * BAR_R + 4, BEND + BAR_R + 2).translate(0, -BAR_R - 2, 0);
  add(`bend-${sx < 0 ? 'left' : 'right'}`, torus(BEND, BAR_R, 16).rotateX(90).intersect(quarter)
    .rotateZ(sx < 0 ? 180 : 0).translate(sx * (HX - BEND), 0, GRIP_Z - BEND).color(handleSteel));
}
// Grip bar between the bends.
const GRIP_LEN = 2 * (HX - BEND);
add('grip-bar', cylinder(GRIP_LEN, BAR_R, 16).rotateY(90).translate(-GRIP_LEN / 2, 0, GRIP_Z).color(handleSteel));

return p.model();
