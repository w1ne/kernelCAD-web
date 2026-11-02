meta({
  name: 'shaft-collar',
  license: 'CC0-1.0',
  title: 'Shaft collar',
  description: 'One-piece round shaft collar with a centered bore and a small radial set-screw boss. Knobs: model size and finish colour.',
  tags: ['shaft collar', 'set collar', 'shaft hardware', 'rotating shaft'],
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
const a = assembly('shaft-collar');
a.part('ring',cylinder(12*s,19*s,16).subtract(cylinder(14*s,10*s,16).translate(0,0,-s)).color(finish));
a.part('boss',cylinder(8*s,5*s,10).rotateX(90).translate(0,19*s,8*s).color(finish));
return a.model();
