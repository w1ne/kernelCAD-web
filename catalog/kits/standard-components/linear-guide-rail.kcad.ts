meta({
  name: 'linear-guide-rail',
  license: 'CC0-1.0',
  title: 'Linear guide rail',
  description: 'Compact linear motion rail with a broad mounting foot and raised central raceway. Knobs: model size and finish colour.',
  tags: ['linear guide', 'guide rail', 'motion rail', 'machine'],
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
const a = assembly('linear-guide-rail');
let base=block(-60*s,-16*s,0,120*s,32*s,7*s);
for (const x of [-45,-15,15,45]) base=base.subtract(cylinder(9*s,3*s,10).translate(x*s,0,-s));
a.part('base',base.color(finish));
a.part('raceway',block(-60*s,-7*s,7*s,120*s,14*s,8*s).color(finish));
return a.model();
