// SPDX-License-Identifier: CC0-1.0
// V-belt pulley: a turned two-groove sheave with deep paired flanges, a keyed
// through-bore and a radial locking screw. The V valleys and keyed bore make
// it read as a belt-drive pulley rather than a stack of plain cylinders.
meta({
  name: 'v-belt-pulley',
  license: 'CC0-1.0',
  title: 'V-belt pulley',
  description: 'Two-groove V-belt sheave with paired retaining flanges, a keyed through-bore, steel key and radial zinc-plated locking screw. Knobs: model size, cast iron sheave, steel key and zinc-plated hardware; dark, brass and weathered presets.',
  tags: ['v-belt pulley', 'sheave', 'belt drive', 'shaft', 'grooved pulley'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 700,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const castIron = param('castIron', '#68747a', { label: 'Cast iron sheave' });
const steel = param('steel', '#9aa5aa', { label: 'Steel shaft key' });
const hardware = param('hardware', '#d1aa54', { label: 'Zinc-plated set screw' });
presets({
  dark: { castIron: '#3b4246', steel: '#59656b', hardware: '#a3adb2' },
  brass: { castIron: '#69645b', steel: '#646f75', hardware: '#c29a5c' },
  weathered: { castIron: '#4d4b46', steel: '#665b4d', hardware: '#a19682' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const axialLift = 5 * s;
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// The axial profile has two distinct V valleys between three raised flange
// lands. A shallow key seat opens the bore at +Y for a real shaft key.
let sheave = turned([
  [7 * s, -5 * s],
  [12 * s, -5 * s],
  [12 * s, 2 * s],
  [18 * s, 2 * s],
  [26 * s, 2 * s],
  [26 * s, 5 * s],
  [20 * s, 7 * s],
  [26 * s, 9 * s],
  [26 * s, 11 * s],
  [20 * s, 13 * s],
  [26 * s, 15 * s],
  [26 * s, 18 * s],
  [18 * s, 18 * s],
  [12 * s, 18 * s],
  [12 * s, 25 * s],
  [7 * s, 25 * s],
]);
sheave = sheave
  .subtract(box(5 * s, 4 * s, 32 * s, true).translate(0, 7 * s, 10 * s))
  // Radial tapped hole for the locking screw, opening into the keyed bore.
  .subtract(cylinder(13 * s, 2.2 * s, 8).rotateX(90).translate(0, 14 * s, 21 * s))
  .translate(0, 0, axialLift);

const a = assembly('v-belt-pulley');
a.part('cast-iron-two-groove-sheave', sheave.color(castIron));
a.part('shaft-key', box(4.4 * s, 1.8 * s, 22 * s, true)
  .translate(0, 8.1 * s, 10 * s + axialLift).color(steel));
a.part('radial-set-screw', cylinder(5 * s, 2.5 * s, 8)
  .rotateX(90).translate(0, 12.5 * s, 21 * s + axialLift).color(hardware));
return a.model();
