// SPDX-License-Identifier: CC0-1.0
// Illustrative 35 mm top-hat (TH35) rail: raised slotted crown, two skirts,
// and outward retaining lips. Not an IEC 60715 certified extrusion/profile.
meta({
  name: 'din-rail',
  license: 'CC0-1.0',
  title: 'DIN rail (TH35 illustrative)',
  description: 'Illustrative CC0 low-poly 35 mm top-hat DIN mounting rail: raised crown, open underside, continuous outward retaining lips, and three actual oblong mounting slots. This is a scene prop, not a dimensionally certified IEC 60715 profile; lip radii, coating, load, tolerances, and mounting pitch are not specified. Model size scales all dimensions; finish color changes appearance only.',
  tags: ['din rail', 'TH35', 'top-hat', 'mounting rail', 'control cabinet', 'electrical', 'CC0', 'scene prop'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 450,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Illustrative model scale' });
const steel = param('steel', '#a5adb1', { label: 'Rail finish appearance' });
presets({
  dark: { steel: '#59646a' },
  galvanized: { steel: '#a5adb1' },
  weathered: { steel: '#777870' },
});
const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) =>
  box(w*s, d*s, h*s).translate(x*s, y*s, z*s);

// X is the rail length, Y the 35 mm width, Z the 7.5 mm height.
// Overlapping by <=0.15 mm at joins gives one connected steel section while
// preserving the open mounting cavity below the raised crown.
let rail = block(-55, -13, 5.9, 110, 26, 1.6);
rail = rail.union(block(-55, -13.1, 1.35, 110, 1.65, 4.7));
rail = rail.union(block(-55, 11.45, 1.35, 110, 1.65, 4.7));
rail = rail.union(block(-55, -17.5, 0, 110, 5.5, 1.5));
rail = rail.union(block(-55, 12, 0, 110, 5.5, 1.5));

// Three 13 x 5 mm rounded slots cut through the elevated mounting crown.
// A colored rectangle on a solid sheet would not be a usable opening.
for (const x of [-34, 0, 34]) {
  const opening = block(x-4, -2.5, 5.5, 8, 5, 3)
    .union(cylinder(3*s, 2.5*s, 16).translate((x-4)*s, 0, 5.5*s))
    .union(cylinder(3*s, 2.5*s, 16).translate((x+4)*s, 0, 5.5*s));
  rail = rail.subtract(opening);
}
const a = assembly('din-rail');
a.part('connected-steel-top-hat-rail', rail.color(steel));
return a.model();
