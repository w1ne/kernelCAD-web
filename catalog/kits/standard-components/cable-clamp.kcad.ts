// Distinctive geometry: Low-profile cable saddle with two fixing ears and a rounded cable guide
meta({
  name: 'cable-clamp',
  license: 'CC0-1.0',
  title: 'Cable clamp',
  description: 'Low-profile cable saddle with two fixing ears and a rounded cable guide Knobs: model size, steel, rubber.',
  tags: ['cable clamp', 'wire clamp', 'strain relief', 'electrical'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 300,
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
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('cable-clamp');
a.part('foot',block(-24*s,-17*s,0,48*s,34*s,4*s).color(steel));
a.part('saddle',cylinder(8*s,15*s,12).subtract(cylinder(10*s,10*s,12).translate(0,0,-s)).translate(0,0,4*s).color(rubber));
a.part('ear-left',block(-24*s,-17*s,0,8*s,34*s,7*s).color(steel));
a.part('ear-right',block(16*s,-17*s,0,8*s,34*s,7*s).color(steel));
return a.model();
