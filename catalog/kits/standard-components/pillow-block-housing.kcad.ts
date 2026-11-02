meta({
  name: 'pillow-block-housing',
  license: 'CC0-1.0',
  title: 'Pillow block housing',
  description: 'Raised pillow-block support with a broad base, round bearing boss and two bolt feet. Knobs: model size and finish colour.',
  tags: ['pillow block', 'bearing housing', 'shaft support', 'machine'],
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
const a = assembly('pillow-block-housing');
a.part('base',block(-32*s,-20*s,0,64*s,40*s,7*s).color(finish));
a.part('left-foot',block(-32*s,-20*s,0,16*s,40*s,13*s).color(finish));
a.part('right-foot',block(16*s,-20*s,0,16*s,40*s,13*s).color(finish));
a.part('bearing',cylinder(22*s,20*s,16).subtract(cylinder(24*s,10*s,12).translate(0,0,-s)).translate(0,0,7*s).color(finish));
return a.model();
