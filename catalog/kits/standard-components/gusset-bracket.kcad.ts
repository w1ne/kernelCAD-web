// Distinctive geometry: Triangular shelf-support bracket with a broad wall plate, horizontal toe and solid diagonal web
meta({
  name: 'gusset-bracket',
  license: 'CC0-1.0',
  title: 'Gusset bracket',
  description: 'Triangular shelf-support bracket with a broad wall plate, horizontal toe and solid diagonal web Knobs: model size, steel, stainless steel.',
  tags: ['gusset bracket', 'shelf support', 'mounting bracket', 'plate'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 380,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const stainless = param('stainless', '#b8c1c6', { label: 'Stainless steel' });
presets({
  dark: { steel: '#3e484e', stainless: '#7d8a91' },
  brass: { steel: '#646f75', stainless: '#b38b52' },
  weathered: { steel: '#665b4d', stainless: '#8b8275' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('gusset-bracket');
a.part('wall', block(-28*s, -3*s, 0, 56*s, 6*s, 42*s).color(steel));
a.part('toe', block(-28*s, -28*s, 0, 56*s, 28*s, 6*s).color(steel));
a.part('gusset', extrudePolygon([[-26*s,0],[26*s,0],[26*s,34*s]], 5*s).rotateX(90).translate(0,0,6*s).color(stainless));
return a.model();
