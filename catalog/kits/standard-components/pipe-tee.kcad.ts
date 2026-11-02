meta({
  name: 'pipe-tee',
  license: 'CC0-1.0',
  title: 'Pipe tee fitting',
  description: 'Three-way T pipe fitting with a vertical run and perpendicular side branch. Knobs: model size and finish colour.',
  tags: ['pipe tee', 'tee fitting', 'plumbing', 'pipe connector'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 360,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('pipe-tee');
const r=12*s;
a.part('run',cylinder(44*s,r,12).subtract(cylinder(46*s,8*s,12).translate(0,0,-s)).color(finish));
a.part('branch',cylinder(36*s,r,12).subtract(cylinder(38*s,8*s,12).translate(0,0,-s)).rotateX(90).translate(0,18*s,22*s).color(finish));
return a.model();
