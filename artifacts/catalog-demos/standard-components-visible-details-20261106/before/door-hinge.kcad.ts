// Distinctive geometry: Two-leaf butt hinge with a full-height hinge barrel and alternating knuckle bands
meta({
  name: 'door-hinge',
  license: 'CC0-1.0',
  title: 'Door hinge',
  description: 'Two-leaf butt hinge with a full-height hinge barrel and alternating knuckle bands Knobs: model size, steel, brass.',
  tags: ['door hinge', 'butt hinge', 'cabinet hardware', 'pivot'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 360,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const brass = param('brass', '#b28a4d', { label: 'Brass' });
presets({
  dark: { steel: '#3e484e', brass: '#725938' },
  brass: { steel: '#646f75', brass: '#c0944d' },
  weathered: { steel: '#665b4d', brass: '#8c734d' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('door-hinge');
a.part('leaf-left',block(-28*s,-18*s,0,27*s,36*s,4*s).color(steel));
a.part('leaf-right',block(1*s,-18*s,0,27*s,36*s,4*s).color(steel));
for (const z of [0,10,20,30]) a.part(`knuckle-${z}`,cylinder(10*s,5*s,12).translate(0,0,z*s).color(steel));
a.part('pin',cylinder(40*s,2*s,10).translate(0,0,0).color(brass));
return a.model();
