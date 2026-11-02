meta({
  name: 'base-mounting-plate',
  license: 'CC0-1.0',
  title: 'Base mounting plate',
  description: 'Square equipment mounting plate with four corner holes and a raised locating boss. Knobs: model size and finish colour.',
  tags: ['mounting plate', 'base plate', 'machine foot', 'flange'],
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
const a = assembly('base-mounting-plate');
let base=block(-30*s,-30*s,0,60*s,60*s,5*s);
for (const x of [-22,22]) for (const y of [-22,22]) base=base.subtract(cylinder(7*s,3*s,10).translate(x*s,y*s,-s));
a.part('plate',base.color(finish));
a.part('boss',cylinder(8*s,13*s,12).translate(0,0,5*s).color(finish));
return a.model();
