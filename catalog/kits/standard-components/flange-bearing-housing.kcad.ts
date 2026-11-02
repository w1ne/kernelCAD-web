meta({
  name: 'flange-bearing-housing',
  license: 'CC0-1.0',
  title: 'Flange bearing housing',
  description: 'Square two-hole bearing mount with a raised round boss and a centered shaft opening. Knobs: model size and finish colour.',
  tags: ['bearing housing', 'flange bearing', 'shaft support', 'mount'],
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
const a = assembly('flange-bearing-housing');
let plate=block(-28*s,-18*s,0,56*s,36*s,8*s);
for (const x of [-19,19]) plate=plate.subtract(cylinder(10*s,3*s,10).translate(x*s,0,-s));
a.part('plate',plate.color(finish));
let boss=cylinder(12*s,20*s,16).translate(0,0,8*s);
boss=boss.subtract(cylinder(14*s,10*s,12).translate(0,0,7*s));
a.part('boss',boss.color(finish));
return a.model();
