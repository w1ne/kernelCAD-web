meta({
  name: 'door-hinge',
  license: 'CC0-1.0',
  title: 'Door hinge',
  description: 'Two-leaf butt hinge with a full-height hinge barrel and alternating knuckle bands. Knobs: model size and finish colour.',
  tags: ['door hinge', 'butt hinge', 'cabinet hardware', 'pivot'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 360,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('door-hinge');
a.part('leaf-left',block(-28*s,-18*s,0,27*s,36*s,4*s).color(finish));
a.part('leaf-right',block(1*s,-18*s,0,27*s,36*s,4*s).color(finish));
for (const z of [0,10,20,30]) a.part(`knuckle-${z}`,cylinder(10*s,5*s,12).translate(0,0,z*s).color(finish));
a.part('pin',cylinder(40*s,2*s,10).translate(0,0,0).color(finish));
return a.model();
