meta({
  name: 'pipe-reducer',
  license: 'CC0-1.0',
  title: 'Pipe reducer',
  description: 'Stepped hollow reducer joining a larger pipe end to a smaller pipe end. Knobs: model size and finish colour.',
  tags: ['pipe reducer', 'reducer fitting', 'pipe adapter', 'plumbing'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 340,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('pipe-reducer');
a.part('large-end',cylinder(10*s,22*s,14).subtract(cylinder(12*s,16*s,12).translate(0,0,-s)).color(finish));
a.part('transition',cylinder(24*s,16*s,12).subtract(cylinder(26*s,11*s,12).translate(0,0,-s)).translate(0,0,10*s).color(finish));
a.part('small-end',cylinder(12*s,13*s,12).subtract(cylinder(14*s,10*s,12).translate(0,0,-s)).translate(0,0,34*s).color(finish));
return a.model();
