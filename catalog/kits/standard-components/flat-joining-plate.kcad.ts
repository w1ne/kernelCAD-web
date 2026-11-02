meta({
  name: 'flat-joining-plate',
  license: 'CC0-1.0',
  title: 'Flat joining plate',
  description: 'Flat strap plate with a row of four mounting holes for joining two parts in line. Knobs: model size and finish colour.',
  tags: ['joining plate', 'strap plate', 'mounting plate', 'connector'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 260,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('flat-joining-plate');
const t=5*s;
let plate=block(-42*s,-12*s,0,84*s,24*s,t);
for (const x of [-30,-10,10,30]) plate=plate.subtract(cylinder(t+2*s,3*s,10).translate(x*s,0,-s));
a.part('plate',plate.color(finish));
return a.model();
