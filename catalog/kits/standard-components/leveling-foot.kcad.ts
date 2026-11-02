meta({
  name: 'leveling-foot',
  license: 'CC0-1.0',
  title: 'Leveling foot',
  description: 'Adjustable leveling foot with a wide circular pad and centered support stem. Knobs: model size and finish colour.',
  tags: ['leveling foot', 'machine foot', 'adjuster', 'mount'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 280,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('leveling-foot');
a.part('pad',cylinder(8*s,22*s,16).translate(0,0,0).color(finish));
a.part('stem',cylinder(24*s,6*s,12).translate(0,0,8*s).color(finish));
a.part('seat',cylinder(4*s,10*s,12).translate(0,0,28*s).color(finish));
return a.model();
