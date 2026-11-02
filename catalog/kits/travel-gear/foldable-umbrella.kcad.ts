// Original kernelCAD compact umbrella shown open or folded for a bag.
// Millimetres, Z up, base sits at z = 0.
meta({
  name: 'foldable-umbrella', license: 'CC0-1.0', title: 'Foldable umbrella',
  description: 'Compact umbrella with a selectable canopy diameter, open or folded state and straight or crook grip. Knobs: canopy, state, handle and colors.',
  tags: ['foldable umbrella', 'travel umbrella', 'rain', 'travel', 'compact'],
  kit: 'travel-gear', category: 'prop', origin: 'base', compat: ['travel', 'rain', 'outdoor'], triangleBudget: 650,
});

const diameter = param('diameter', '1000', { choices: ['900', '1000', '1150'], label: 'Open canopy diameter (mm)' });
const state = param('state', 'open', { choices: ['open', 'folded'], label: 'Umbrella state' });
const handle = param('handle', 'crook', { choices: ['crook', 'straight'], label: 'Grip style' });
const canopy = param('canopy', '#426783', { label: 'Canopy and sleeve' });
const fittings = param('fittings', '#33383d', { label: 'Shaft and fittings' });
const radius = Number(diameter.value) / 2;
const umbrella = assembly('foldable-umbrella');
umbrella.part('shaft', cylinder(670, 18, 8).translate(0, 0, 0).color(fittings));

if (state.value === 'open') {
  umbrella.part('canopy', sphere(radius).scale([1, 1, 0.38]).translate(0, 0, 678).color(canopy));
  umbrella.part('runner', cylinder(30, 38, 10).translate(0, 0, 570).color(fittings));
  for (const angle of [0, 45, 90, 135]) {
    umbrella.part(`rib-${angle}`, box(radius * 1.56, 8, 12, true).rotateZ(angle).translate(0, 0, 630).color(fittings));
  }
} else {
  umbrella.part('folded-sleeve', box(74, 74, 560, true).translate(0, 0, 320).color(canopy));
  umbrella.part('sleeve-band', box(86, 82, 34, true).translate(0, 0, 345).color(fittings));
}

if (handle.value === 'crook') {
  umbrella.part('grip-stem', box(28, 28, 96, true).translate(0, 0, 52).color(fittings));
  umbrella.part('grip-return', box(88, 28, 28, true).translate(34, 0, 16).color(fittings));
} else {
  umbrella.part('straight-grip', cylinder(112, 32, 10).translate(0, 0, 56).color(fittings));
}

return umbrella.model();
