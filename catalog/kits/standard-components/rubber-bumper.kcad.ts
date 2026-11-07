// Distinctive geometry: Low-profile cylindrical vibration bumper with a flat base and centered mounting stem
meta({
  name: 'rubber-bumper',
  license: 'CC0-1.0',
  title: 'Rubber bumper',
  description: 'Low-profile cylindrical vibration bumper with a flat base and centered mounting stem Knobs: model size, steel, rubber.',
  tags: ['rubber bumper', 'vibration mount', 'foot', 'isolation'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 260,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const rubber = param('rubber', '#353a3d', { label: 'Rubber' });
presets({
  dark: { steel: '#3e484e', rubber: '#242729' },
  brass: { steel: '#646f75', rubber: '#2a2d2f' },
  weathered: { steel: '#665b4d', rubber: '#3b3935' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('rubber-bumper');
a.part('base',cylinder(12*s,18*s,12).translate(0,0,0).color(rubber));
a.part('crown',cylinder(5*s,15*s,12).translate(0,0,12*s).color(rubber));
a.part('stem',cylinder(12*s,5*s,10).translate(0,0,17*s).color(steel));
return a.model();
