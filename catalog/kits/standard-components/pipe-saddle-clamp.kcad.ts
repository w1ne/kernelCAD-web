meta({
  name: 'pipe-saddle-clamp',
  license: 'CC0-1.0',
  title: 'Pipe saddle clamp',
  description: 'Two-piece saddle clamp with a curved seat, twin side lugs and a mounting foot. Knobs: model size and finish colour.',
  tags: ['pipe clamp', 'saddle clamp', 'tube support', 'plumbing'],
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
const a = assembly('pipe-saddle-clamp');
a.part('foot',block(-28*s,-18*s,0,56*s,36*s,5*s).color(finish));
a.part('seat',cylinder(8*s,18*s,12).subtract(cylinder(10*s,13*s,12).translate(0,0,-s)).translate(0,0,5*s).color(finish));
a.part('left-lug',block(-26*s,-18*s,5*s,5*s,36*s,16*s).color(finish));
a.part('right-lug',block(21*s,-18*s,5*s,5*s,36*s,16*s).color(finish));
return a.model();
