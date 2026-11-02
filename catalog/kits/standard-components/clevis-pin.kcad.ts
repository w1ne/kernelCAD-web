meta({
  name: 'clevis-pin',
  license: 'CC0-1.0',
  title: 'Clevis pin',
  description: 'Round headed clevis pin with a straight shank and cross-hole collar. Knobs: model size and finish colour.',
  tags: ['clevis pin', 'pivot pin', 'linkage hardware', 'fastener'],
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
const a = assembly('clevis-pin');
let shank=cylinder(34*s,5*s,12);
shank=shank.subtract(cylinder(10*s,2*s,10).rotateX(90).translate(0,5*s,28*s));
a.part('shank',shank.color(finish));
a.part('head',cylinder(5*s,10*s,12).translate(0,0,34*s).color(finish));
return a.model();
