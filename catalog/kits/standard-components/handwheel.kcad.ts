meta({
  name: 'handwheel',
  license: 'CC0-1.0',
  title: 'Handwheel',
  description: 'Three-spoke handwheel with a raised center hub and a clear circular rim. Knobs: model size and finish colour.',
  tags: ['handwheel', 'control wheel', 'valve wheel', 'machine control'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 340,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('handwheel');
const rim=cylinder(6*s,30*s,16).subtract(cylinder(8*s,24*s,16).translate(0,0,-s));
a.part('rim',rim.rotateX(90).translate(0,3*s,30*s).color(finish));
a.part('hub',cylinder(18*s,10*s,12).rotateX(90).translate(0,9*s,30*s).color(finish));
for (const angle of [0,60,120]) a.part(`spoke-${angle}`,box(52*s,5*s,5*s,true).rotateY(angle).translate(0,3*s,30*s).color(finish));
return a.model();
