meta({
  name: 'din-rail-end-stop',
  license: 'CC0-1.0',
  title: 'DIN rail end stop',
  description: 'Small rail-end stop with a raised clamp block and front-facing tightening boss. Knobs: model size and finish colour.',
  tags: ['din rail end stop', 'rail stop', 'electrical cabinet', 'mount'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 300,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('din-rail-end-stop');
a.part('foot',block(-18*s,-16*s,0,36*s,32*s,5*s).color(finish));
a.part('stop-face',block(-18*s,-16*s,5*s,36*s,8*s,18*s).color(finish));
a.part('clamp',block(-6*s,-8*s,8*s,12*s,24*s,13*s).color(finish));
a.part('boss',cylinder(6*s,5*s,10).rotateX(90).translate(0,16*s,14*s).color(finish));
return a.model();
