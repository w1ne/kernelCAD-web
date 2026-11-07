// Distinctive geometry: Short hollow steel spacer with a thin polymer isolation sleeve lining its centered clearance bore.
meta({
  name: 'tubular-spacer',
  license: 'CC0-1.0',
  title: 'Tubular spacer',
  description: 'Short hollow steel spacer with a thin polymer isolation sleeve lining its centered clearance bore. Knobs: model size, steel, engineering polymer.',
  tags: ['spacer', 'tube spacer', 'standoff', 'hardware'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 260,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const polymer = param('polymer', '#e46b3c', { label: 'Engineering polymer' });
presets({
  dark: { steel: '#3e484e', polymer: '#244956' },
  brass: { steel: '#646f75', polymer: '#1d5364' },
  weathered: { steel: '#665b4d', polymer: '#96734f' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('tubular-spacer');
a.part('spacer',cylinder(16*s,14*s,12).subtract(cylinder(18*s,6*s,10).translate(0,0,-s)).color(steel));
a.part('isolation-liner',cylinder(16*s,5.9*s,12).subtract(cylinder(18*s,5.1*s,12).translate(0,0,-s)).color(polymer));
return a.model();
