// Distinctive geometry: Stepped V-belt pulley with two shallow belt grooves and a through bore
meta({
  name: 'v-belt-pulley',
  license: 'CC0-1.0',
  title: 'V-belt pulley',
  description: 'Stepped V-belt pulley with two shallow belt grooves and a through bore Knobs: model size, steel, cast iron.',
  tags: ['v-belt pulley', 'sheave', 'belt drive', 'shaft'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 420,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const castIron = param('castIron', '#68747a', { label: 'Cast iron' });
presets({
  dark: { steel: '#3e484e', castIron: '#3b4246' },
  brass: { steel: '#646f75', castIron: '#69645b' },
  weathered: { steel: '#665b4d', castIron: '#4d4b46' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('v-belt-pulley');
a.part('hub',cylinder(24*s,12*s,8).subtract(cylinder(26*s,7*s,8).translate(0,0,-s)).translate(0,0,2*s).color(castIron));
a.part('rim-lower',cylinder(5*s,24*s,8).subtract(cylinder(7*s,7*s,8).translate(0,0,-s)).color(steel));
a.part('rim-mid',cylinder(8*s,20*s,8).subtract(cylinder(10*s,7*s,8).translate(0,0,-s)).translate(0,0,5*s).color(steel));
a.part('rim-upper',cylinder(5*s,24*s,8).subtract(cylinder(7*s,7*s,8).translate(0,0,-s)).translate(0,0,13*s).color(steel));
return a.model();
