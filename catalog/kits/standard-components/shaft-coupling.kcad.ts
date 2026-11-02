meta({
  name: 'shaft-coupling',
  license: 'CC0-1.0',
  title: 'Shaft coupling sleeve',
  description: 'Straight shaft coupler with a thicker center band and two aligned shaft bores. Knobs: model size and finish colour.',
  tags: ['shaft coupling', 'shaft sleeve', 'rotary coupling', 'machine'],
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
const a = assembly('shaft-coupling');
a.part('left-hub',cylinder(15*s,17*s,14).subtract(cylinder(17*s,8*s,12).translate(0,0,-s)).color(finish));
a.part('center-band',cylinder(8*s,19*s,14).subtract(cylinder(10*s,8*s,12).translate(0,0,-s)).translate(0,0,15*s).color(finish));
a.part('right-hub',cylinder(15*s,17*s,14).subtract(cylinder(17*s,8*s,12).translate(0,0,-s)).translate(0,0,23*s).color(finish));
return a.model();
