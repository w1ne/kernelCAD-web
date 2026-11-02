meta({
  name: 'pipe-coupling',
  license: 'CC0-1.0',
  title: 'Pipe coupling sleeve',
  description: 'Short hollow straight coupling sleeve with raised end collars. Knobs: model size and finish colour.',
  tags: ['pipe coupling', 'sleeve coupling', 'pipe fitting', 'plumbing'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 320,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('pipe-coupling');
a.part('sleeve',cylinder(28*s,17*s,14).subtract(cylinder(30*s,12*s,12).translate(0,0,-s)).color(finish));
a.part('collar-a',cylinder(4*s,19*s,14).subtract(cylinder(6*s,12*s,12).translate(0,0,-s)).color(finish));
a.part('collar-b',cylinder(4*s,19*s,14).subtract(cylinder(6*s,12*s,12).translate(0,0,-s)).translate(0,0,24*s).color(finish));
return a.model();
