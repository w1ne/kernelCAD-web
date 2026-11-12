// SPDX-License-Identifier: CC0-1.0
// Illustrative low-poly 45-degree elbow with a continuous, open bore.
// Not pressure-rated, tolerance-controlled or manufacturer-certified CAD.
meta({
  name: 'pipe-elbow-45',
  license: 'CC0-1.0',
  title: '45 degree pipe elbow',
  description: 'Illustrative 45-degree elbow with two open ports and one connected Ø16 mm passage at standard size. End collars are separate visual bodies, not specified pressure fittings. Knobs: model size and finish colors only.',
  tags: ['pipe elbow', '45 degree elbow', 'plumbing fitting', 'tube'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 560,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Body finish color (visual only)' });
const bronze = param('bronze', '#98714c', { label: 'Collar finish color (visual only)' });
presets({
  dark: { steel: '#3e484e', bronze: '#684d37' },
  brass: { steel: '#646f75', bronze: '#b0804d' },
  weathered: { steel: '#665b4d', bronze: '#6e583f' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('pipe-elbow-45');
const outerRadius = 12 * s;
const boreRadius = 8 * s;
const lowerLength = 20 * s;
const upperLength = 29 * s;
// Both outside legs and the rounded corner must form one shell. Cutting one
// connected pair of centerline passages after the union prevents a solid cap.
const body = cylinder(lowerLength, outerRadius, 16)
  .union(cylinder(upperLength, outerRadius, 16).rotateY(45).translate(0, 0, lowerLength))
  .union(sphere(outerRadius).translate(0, 0, lowerLength));
const inlet = cylinder(lowerLength + 2 * s, boreRadius, 16).translate(0, 0, -s);
const outlet = cylinder(upperLength + 2 * s, boreRadius, 16)
  .translate(0, 0, -s).rotateY(45).translate(0, 0, lowerLength);
a.part('connected-open-elbow', body.subtract(inlet.union(outlet)).color(steel));
// These two annuli remain open and are decorative, not specified hardware.
const collar = cylinder(2 * s, outerRadius + s, 16)
  .subtract(cylinder(4 * s, boreRadius, 16).translate(0, 0, -s));
a.part('lower-port-collar', collar.color(bronze));
a.part('angled-port-collar', collar.rotateY(45)
  .translate(upperLength * Math.SQRT1_2 - s * Math.SQRT1_2,
    0, lowerLength + upperLength * Math.SQRT1_2 - s * Math.SQRT1_2).color(bronze));
return a.model();
