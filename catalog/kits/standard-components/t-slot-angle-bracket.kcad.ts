// Distinctive geometry: Compact external corner bracket for joining two perpendicular framing profiles
meta({
  name: 't-slot-angle-bracket',
  license: 'CC0-1.0',
  title: 'T-slot angle bracket',
  description: 'Compact external corner bracket for joining two perpendicular framing profiles Knobs: model size, steel, aluminum.',
  tags: ['t-slot', 'angle bracket', 'frame connector', 'extrusion'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 380,
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
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('t-slot-angle-bracket');
a.part('base',block(-24*s,-20*s,0,48*s,40*s,5*s).color(aluminum));
a.part('upright',block(-24*s,15*s,5*s,48*s,5*s,34*s).color(aluminum));
a.part('web-a',extrudePolygon([[-20*s,0],[0,0],[0,24*s]],4*s).rotateX(90).translate(-18*s,15*s,5*s).color(steel));
a.part('web-b',extrudePolygon([[0,0],[20*s,0],[0,24*s]],4*s).rotateX(90).translate(14*s,15*s,5*s).color(steel));
return a.model();
