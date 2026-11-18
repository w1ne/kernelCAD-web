// SPDX-License-Identifier: CC0-1.0
// Hollow mounting sleeve with a continuous polymer bore liner and bright
// plated rims that make the opening and usable length visible in preview.
meta({
  name: 'tubular-spacer',
  license: 'CC0-1.0',
  title: 'Tubular spacer',
  description: 'Hollow steel spacer with a continuous polymer bore liner, chamfered ends and plated end rims. Choose short, standard or long length; steel, liner and rim colors are independent.',
  tags: ['spacer', 'tube spacer', 'standoff', 'sleeve', 'hardware'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 520,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const lengthChoice = param('length', 'standard', { choices: ['short', 'standard', 'long'], label: 'Sleeve length' });
const steel = param('steel', '#426a83', { label: 'Steel sleeve' });
const polymer = param('polymer', '#e46b3c', { label: 'Engineering polymer liner' });
const endRims = param('endRims', '#cbd1d5', { label: 'Zinc-plated end rims' });

presets({
  dark: { steel: '#3e484e', polymer: '#244956', endRims: '#929da3' },
  brass: { steel: '#646f75', polymer: '#1d5364', endRims: '#b0804d' },
  weathered: { steel: '#665b4d', polymer: '#96734f', endRims: '#a19682' },
  insulated: { steel: '#7f8b91', polymer: '#3b9b77', endRims: '#d7dcde' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const lengthMm = (lengthChoice.value === 'short' ? 22 : lengthChoice.value === 'long' ? 50 : 36) * s;
const outerRadius = 15 * s;
const boreRadius = 7.8 * s;
const linerRadius = 0.8 * s;
const chamfer = 1.2 * s;

// The turned section forms one hollow sleeve with chamfered outer edges.
const sleeve = path()
  .moveTo(boreRadius, chamfer * 0.65)
  .lineTo(outerRadius - chamfer, 0)
  .lineTo(outerRadius, chamfer)
  .lineTo(outerRadius, lengthMm - chamfer)
  .lineTo(outerRadius - chamfer, lengthMm)
  .lineTo(boreRadius, lengthMm - chamfer * 0.65)
  .lineTo(boreRadius, chamfer * 0.65)
  .close()
  .revolve();

// The liner leaves a smaller, clearly colored clearance bore through the part.
const liner = path()
  .moveTo(boreRadius - linerRadius, chamfer * 0.8)
  .lineTo(boreRadius, chamfer * 0.8)
  .lineTo(boreRadius, lengthMm - chamfer * 0.8)
  .lineTo(boreRadius - linerRadius, lengthMm - chamfer * 0.8)
  .close()
  .revolve();

const annulus = (height: number, outer: number, inner: number, z: number) =>
  cylinder(height, outer, 20)
    .subtract(cylinder(height + 2 * s, inner, 20).translate(0, 0, -s))
    .translate(0, 0, z);

const spacer = assembly('tubular-spacer');
spacer.part('steel-sleeve', sleeve.color(steel));
spacer.part('polymer-bore-liner', liner.color(polymer));
spacer.part('lower-plated-rim', annulus(1.5 * s, outerRadius + 0.35 * s, outerRadius - 1.3 * s, 0).color(endRims));
spacer.part('upper-plated-rim', annulus(1.5 * s, outerRadius + 0.35 * s, outerRadius - 1.3 * s, lengthMm - 1.5 * s).color(endRims));

return spacer.model();
