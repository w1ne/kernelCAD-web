meta({
  name: 'shim-pack',
  license: 'CC0-1.0',
  title: 'Shim pack',
  description: 'Stack of thin rectangular alignment shims with small offset pull tabs. Knobs: model size and finish colour.',
  tags: ['shim', 'shim pack', 'alignment', 'machine setup'],
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
const a = assembly('shim-pack');
for (const i of [0,1,2,3]) a.part(`shim-${i}`,block(-22*s+(i/2)*s,-16*s, i*1.5*s,44*s,32*s,1.5*s).color(finish));
a.part('tabs',block(15*s,-4*s,0,12*s,8*s,8*s).color(finish));
return a.model();
