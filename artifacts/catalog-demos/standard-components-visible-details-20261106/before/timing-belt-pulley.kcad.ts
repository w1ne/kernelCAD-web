// Distinctive geometry: Toothed low-poly belt pulley with two retaining flanges and a centered shaft bore
meta({
  name: 'timing-belt-pulley',
  license: 'CC0-1.0',
  title: 'Timing belt pulley',
  description: 'Toothed low-poly belt pulley with two retaining flanges and a centered shaft bore Knobs: model size, steel, aluminum.',
  tags: ['timing pulley', 'belt pulley', 'drive component', 'shaft'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 340,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const aluminum = param('aluminum', '#aebac0', { label: 'Aluminum' });
presets({
  dark: { steel: '#3e484e', aluminum: '#586970' },
  brass: { steel: '#646f75', aluminum: '#aab8bc' },
  weathered: { steel: '#665b4d', aluminum: '#788177' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('timing-belt-pulley');
a.part('core',cylinder(18*s,20*s,16).subtract(cylinder(20*s,8*s,12).translate(0,0,-s)).translate(0,0,4*s).color(aluminum));
a.part('lower-flange',cylinder(4*s,24*s,16).subtract(cylinder(6*s,8*s,12).translate(0,0,-s)).color(steel));
a.part('upper-flange',cylinder(4*s,24*s,16).subtract(cylinder(6*s,8*s,12).translate(0,0,-s)).translate(0,0,22*s).color(steel));
return a.model();
