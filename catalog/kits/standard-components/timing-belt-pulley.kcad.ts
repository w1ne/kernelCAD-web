meta({
  name: 'timing-belt-pulley',
  license: 'CC0-1.0',
  title: 'Timing belt pulley',
  description: 'Toothed low-poly belt pulley with two retaining flanges and a centered shaft bore. Knobs: model size and finish colour.',
  tags: ['timing pulley', 'belt pulley', 'drive component', 'shaft'],
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
const a = assembly('timing-belt-pulley');
a.part('core',cylinder(18*s,20*s,16).subtract(cylinder(20*s,8*s,12).translate(0,0,-s)).translate(0,0,4*s).color(finish));
a.part('lower-flange',cylinder(4*s,24*s,16).subtract(cylinder(6*s,8*s,12).translate(0,0,-s)).color(finish));
a.part('upper-flange',cylinder(4*s,24*s,16).subtract(cylinder(6*s,8*s,12).translate(0,0,-s)).translate(0,0,22*s).color(finish));
return a.model();
