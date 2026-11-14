// Distinctive geometry: Panel cable gland with a hollow body, stepped compression nut and wide sealing flange
meta({
  name: 'cable-gland',
  license: 'CC0-1.0',
  title: 'Cable gland',
  description: 'Panel cable gland with a hollow body, stepped compression nut and wide sealing flange Knobs: model size, engineering polymer, rubber.',
  tags: ['cable gland', 'cord grip', 'panel fitting', 'electrical'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 420,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const polymer = param('polymer', '#e46b3c', { label: 'Engineering polymer' });
const rubber = param('rubber', '#353a3d', { label: 'Rubber' });
presets({
  dark: { polymer: '#244956', rubber: '#242729' },
  brass: { polymer: '#1d5364', rubber: '#2a2d2f' },
  weathered: { polymer: '#96734f', rubber: '#3b3935' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('cable-gland');
a.part('body',cylinder(22*s,12*s,8).subtract(cylinder(24*s,7*s,8).translate(0,0,-s)).color(polymer));
a.part('flange',cylinder(4*s,20*s,8).subtract(cylinder(6*s,7*s,8).translate(0,0,-s)).color(polymer));
a.part('cap',cylinder(8*s,16*s,8).subtract(cylinder(10*s,7*s,8).translate(0,0,-s)).translate(0,0,22*s).color(polymer));
a.part('strain-relief',cylinder(7*s,10*s,8).subtract(cylinder(9*s,7*s,8).translate(0,0,-s)).translate(0,0,30*s).color(rubber));
return a.model();
