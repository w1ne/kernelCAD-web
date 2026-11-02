meta({
  name: 'knurled-knob',
  license: 'CC0-1.0',
  title: 'Knurled knob',
  description: 'Compact control knob with a broad grip body, raised crown and center stem. Knobs: model size and finish colour.',
  tags: ['knob', 'control knob', 'machine control', 'handwheel'],
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
const a = assembly('knurled-knob');
a.part('stem',cylinder(10*s,6*s,10).translate(0,0,0).color(finish));
a.part('grip',cylinder(18*s,18*s,12).translate(0,0,10*s).color(finish));
a.part('crown',cylinder(5*s,15*s,12).translate(0,0,28*s).color(finish));
for (const angle of [0,45,90,135,180,225,270,315]) a.part(`grip-rib-${angle}`,box(2*s,4*s,12*s,true).translate(0,16*s,19*s).rotateZ(angle).color(finish));
return a.model();
