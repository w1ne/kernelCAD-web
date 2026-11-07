// Distinctive geometry: Long continuous hinge with two flat leaves, alternating knuckles, and a visible stainless hinge pin.
meta({
  name: 'piano-hinge',
  license: 'CC0-1.0',
  title: 'Piano hinge',
  description: 'Long continuous hinge with two flat leaves, alternating knuckles, and a visible stainless hinge pin. Knobs: model size, steel, stainless steel.',
  tags: ['piano hinge', 'continuous hinge', 'cabinet hardware', 'pivot'],
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
const a = assembly('piano-hinge');
a.part('leaf-left',block(-45*s,-18*s,0,45*s,36*s,3*s).color(steel));
a.part('leaf-right',block(0,-18*s,0,45*s,36*s,3*s).color(steel));
for (const x of [-40,-24,-8,8,24,40]) a.part(`knuckle-${x}`,cylinder(8*s,4*s,10).rotateY(90).translate(x*s,0,4*s).color(steel));
a.part('hinge-pin',cylinder(80*s,2*s,10).rotateY(90).translate(-40*s,0,4*s).color(stainless));
return a.model();
