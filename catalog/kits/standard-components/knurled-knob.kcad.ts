// Distinctive geometry: Compact control knob with a broad grip body, raised crown and center stem
meta({
  name: 'knurled-knob',
  license: 'CC0-1.0',
  title: 'Knurled knob',
  description: 'Compact control knob with a broad grip body, raised crown and center stem Knobs: model size, steel, aluminum, engineering polymer.',
  tags: ['knob', 'control knob', 'machine control', 'handwheel'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 300,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const aluminum = param('aluminum', '#aebac0', { label: 'Aluminum' });
const polymer = param('polymer', '#e46b3c', { label: 'Engineering polymer' });
presets({
  dark: { steel: '#3e484e', aluminum: '#586970', polymer: '#244956' },
  brass: { steel: '#646f75', aluminum: '#aab8bc', polymer: '#1d5364' },
  weathered: { steel: '#665b4d', aluminum: '#788177', polymer: '#96734f' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('knurled-knob');
a.part('stem',cylinder(10*s,6*s,10).translate(0,0,0).color(steel));
a.part('grip',cylinder(18*s,18*s,12).translate(0,0,10*s).color(polymer));
a.part('crown',cylinder(5*s,15*s,12).translate(0,0,28*s).color(aluminum));
for (const angle of [0,45,90,135,180,225,270,315]) a.part(`grip-rib-${angle}`,box(2*s,4*s,12*s,true).translate(0,16*s,19*s).rotateZ(angle).color(steel));
return a.model();
