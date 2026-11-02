meta({
  name: 'gusset-bracket',
  license: 'CC0-1.0',
  title: 'Gusset bracket',
  description: 'Triangular shelf-support bracket with a broad wall plate, horizontal toe and solid diagonal web. Knobs: model size and finish colour.',
  tags: ['gusset bracket', 'shelf support', 'mounting bracket', 'plate'],
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
const a = assembly('gusset-bracket');
a.part('wall', block(-28*s, -3*s, 0, 56*s, 6*s, 42*s).color(finish));
a.part('toe', block(-28*s, -28*s, 0, 56*s, 28*s, 6*s).color(finish));
a.part('gusset', extrudePolygon([[-26*s,0],[26*s,0],[26*s,34*s]], 5*s).rotateX(90).translate(0,0,6*s).color(finish));
return a.model();
