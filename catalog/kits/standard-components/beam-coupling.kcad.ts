meta({
  name: 'beam-coupling',
  license: 'CC0-1.0',
  title: 'Beam coupling',
  description: 'Slender beam-style flexible shaft coupling with two end hubs and a slotted center sleeve. Knobs: model size and finish colour.',
  tags: ['beam coupling', 'flexible coupling', 'shaft coupling', 'rotary'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 480,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('beam-coupling');
let sleeve=cylinder(30*s,14*s,8).subtract(cylinder(32*s,8*s,8).translate(0,0,-s));
for (const angle of [0,90,180,270]) sleeve=sleeve.subtract(block(-2*s,-16*s,4*s,4*s,8*s,22*s).rotateZ(angle));
a.part('sleeve',sleeve.color(finish));
a.part('end-a',cylinder(6*s,18*s,8).subtract(cylinder(8*s,8*s,8).translate(0,0,-s)).color(finish));
a.part('end-b',cylinder(6*s,18*s,8).subtract(cylinder(8*s,8*s,8).translate(0,0,-s)).translate(0,0,24*s).color(finish));
return a.model();
