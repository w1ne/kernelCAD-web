meta({
  name: 'cable-gland',
  license: 'CC0-1.0',
  title: 'Cable gland',
  description: 'Panel cable gland with a hollow body, stepped compression nut and wide sealing flange. Knobs: model size and finish colour.',
  tags: ['cable gland', 'cord grip', 'panel fitting', 'electrical'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 420,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('cable-gland');
a.part('body',cylinder(22*s,12*s,8).subtract(cylinder(24*s,7*s,8).translate(0,0,-s)).color(finish));
a.part('flange',cylinder(4*s,20*s,8).subtract(cylinder(6*s,7*s,8).translate(0,0,-s)).color(finish));
a.part('cap',cylinder(8*s,16*s,8).subtract(cylinder(10*s,7*s,8).translate(0,0,-s)).translate(0,0,22*s).color(finish));
a.part('strain-relief',cylinder(7*s,10*s,8).subtract(cylinder(9*s,7*s,8).translate(0,0,-s)).translate(0,0,30*s).color(finish));
return a.model();
