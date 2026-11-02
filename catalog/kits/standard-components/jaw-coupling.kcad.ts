meta({
  name: 'jaw-coupling',
  license: 'CC0-1.0',
  title: 'Jaw coupling',
  description: 'Two jaw hubs with a visible flexible center spider between the shaft bores. Knobs: model size and finish colour.',
  tags: ['jaw coupling', 'flexible coupling', 'shaft connector', 'rotary'],
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
const a = assembly('jaw-coupling');
a.part('hub-a',cylinder(16*s,18*s,14).subtract(cylinder(18*s,8*s,12).translate(0,0,-s)).color(finish));
a.part('spider',cylinder(8*s,14*s,12).translate(0,0,16*s).color(finish));
a.part('hub-b',cylinder(16*s,18*s,14).subtract(cylinder(18*s,8*s,12).translate(0,0,-s)).translate(0,0,24*s).color(finish));
return a.model();
