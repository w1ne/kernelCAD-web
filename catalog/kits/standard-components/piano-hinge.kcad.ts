meta({
  name: 'piano-hinge',
  license: 'CC0-1.0',
  title: 'Piano hinge',
  description: 'Long continuous hinge with two flat leaves and alternating knuckles along the pin. Knobs: model size and finish colour.',
  tags: ['piano hinge', 'continuous hinge', 'cabinet hardware', 'pivot'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 380,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('piano-hinge');
a.part('leaf-left',block(-45*s,-18*s,0,45*s,36*s,3*s).color(finish));
a.part('leaf-right',block(0,-18*s,0,45*s,36*s,3*s).color(finish));
for (const x of [-40,-24,-8,8,24,40]) a.part(`knuckle-${x}`,cylinder(8*s,4*s,10).rotateY(90).translate(x*s,0,4*s).color(finish));
return a.model();
