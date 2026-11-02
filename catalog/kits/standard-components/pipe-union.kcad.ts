meta({
  name: 'pipe-union',
  license: 'CC0-1.0',
  title: 'Pipe union',
  description: 'Compact union fitting with two hollow sockets and a broad central hex-like nut body. Knobs: model size and finish colour.',
  tags: ['pipe union', 'union fitting', 'pipe connector', 'plumbing'],
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
const a = assembly('pipe-union');
a.part('socket-a',cylinder(12*s,16*s,12).subtract(cylinder(14*s,10*s,12).translate(0,0,-s)).color(finish));
a.part('nut',block(-18*s,-18*s,12*s,36*s,36*s,12*s).subtract(cylinder(14*s,10*s,12).translate(0,0,11*s)).color(finish));
a.part('socket-b',cylinder(12*s,16*s,12).subtract(cylinder(14*s,10*s,12).translate(0,0,-s)).translate(0,0,24*s).color(finish));
return a.model();
