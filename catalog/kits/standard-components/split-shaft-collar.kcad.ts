meta({
  name: 'split-shaft-collar',
  license: 'CC0-1.0',
  title: 'Split shaft collar',
  description: 'Split clamp collar with a through bore and a raised clamp lug. Knobs: model size and finish colour.',
  tags: ['shaft collar', 'split collar', 'clamp', 'rotating shaft'],
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
const a = assembly('split-shaft-collar');
let collar=cylinder(10*s,18*s,16).subtract(cylinder(12*s,9*s,16).translate(0,0,-s));
collar=collar.subtract(block(-2*s,8*s,-s,4*s,12*s,12*s));
a.part('collar',collar.color(finish));
a.part('lug',block(12*s,11*s,2*s,10*s,8*s,8*s).color(finish));
return a.model();
