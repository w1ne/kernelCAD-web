meta({
  name: 'v-belt-pulley',
  license: 'CC0-1.0',
  title: 'V-belt pulley',
  description: 'Stepped V-belt pulley with two shallow belt grooves and a through bore. Knobs: model size and finish colour.',
  tags: ['v-belt pulley', 'sheave', 'belt drive', 'shaft'],
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
const a = assembly('v-belt-pulley');
a.part('hub',cylinder(24*s,12*s,8).subtract(cylinder(26*s,7*s,8).translate(0,0,-s)).translate(0,0,2*s).color(finish));
a.part('rim-lower',cylinder(5*s,24*s,8).subtract(cylinder(7*s,7*s,8).translate(0,0,-s)).color(finish));
a.part('rim-mid',cylinder(8*s,20*s,8).subtract(cylinder(10*s,7*s,8).translate(0,0,-s)).translate(0,0,5*s).color(finish));
a.part('rim-upper',cylinder(5*s,24*s,8).subtract(cylinder(7*s,7*s,8).translate(0,0,-s)).translate(0,0,13*s).color(finish));
return a.model();
