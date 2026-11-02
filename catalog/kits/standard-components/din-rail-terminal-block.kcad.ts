meta({
  name: 'din-rail-terminal-block',
  license: 'CC0-1.0',
  title: 'DIN rail terminal block',
  description: 'Single terminal block body with top access wells and a stepped rail foot. Knobs: model size and finish colour.',
  tags: ['terminal block', 'din rail', 'electrical connector', 'cabinet'],
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
const a = assembly('din-rail-terminal-block');
let body=block(-14*s,-12*s,6*s,28*s,24*s,27*s);
for (const x of [-7,7]) body=body.subtract(cylinder(9*s,3*s,10).translate(x*s,0,25*s));
a.part('body',body.color(finish));
a.part('rail-foot',block(-10*s,-9*s,0,20*s,18*s,6*s).color(finish));
return a.model();
