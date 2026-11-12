// SPDX-License-Identifier: CC0-1.0
// Illustrative low-poly 90° pipe elbow with one connected, open fluid passage.
// It is a scene prop, not a pressure-rated or dimensionally certified fitting.
meta({
  name: 'pipe-elbow-90',
  license: 'CC0-1.0',
  title: '90 degree pipe elbow',
  description: 'Illustrative elbow with two perpendicular open ports and a connected Ø18 mm passage at standard size. Bronze-colored end collars are separate visual bodies. Not pressure-rated CAD. Knobs: model size and finish colors.',
  tags: ['pipe elbow', '90 degree elbow', 'plumbing fitting', 'tube'],
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
const a = assembly('pipe-elbow-90');
const outerRadius = 13 * s;
const boreRadius = 9 * s;
const elbowHeight = 28 * s;
const outletLength = 26 * s;
// Fuse both crossing outer tubes *before* cutting the common bore. The old
// separate tubes and solid bend visually concealed two blocked/disconnected ports.
const outer = cylinder(elbowHeight, outerRadius, 16)
  .union(cylinder(outletLength, outerRadius, 16).rotateY(90).translate(0, 0, elbowHeight))
  .union(sphere(outerRadius).translate(0, 0, elbowHeight));
const verticalPassage = cylinder(elbowHeight + 2 * s, boreRadius, 16).translate(0, 0, -s);
const sidePassage = cylinder(outletLength + 2 * s, boreRadius, 16)
  .rotateY(90).translate(-s, 0, elbowHeight);
const shell = outer.subtract(verticalPassage.union(sidePassage));
a.part('one-piece-open-elbow', shell.color(steel));
const collar = cylinder(2 * s, 14 * s, 16)
  .subtract(cylinder(4 * s, boreRadius, 16).translate(0, 0, -s));
a.part('inlet-reinforcing-collar', collar.color(bronze));
a.part('outlet-reinforcing-collar', collar.rotateY(90)
  .translate(outletLength - s, 0, elbowHeight).color(bronze));
return a.model();
