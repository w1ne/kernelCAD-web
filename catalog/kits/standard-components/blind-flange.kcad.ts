meta({
  name: 'blind-flange',
  license: 'CC0-1.0',
  title: 'Blind flange',
  description: 'Solid round blind pipe flange with four recessed mounting-hole bores. Knobs: model size and finish colour.',
  tags: ['blind flange', 'pipe cap', 'flange', 'plumbing'],
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
const a = assembly('blind-flange');
let flange=cylinder(8*s,28*s,16);
for (const [x,y] of [[-17,-17],[17,-17],[17,17],[-17,17]]) flange=flange.subtract(cylinder(10*s,3*s,10).translate(x*s,y*s,-s));
a.part('plate',flange.color(finish));
a.part('hub',cylinder(3*s,10*s,12).translate(0,0,8*s).color(finish));
return a.model();
