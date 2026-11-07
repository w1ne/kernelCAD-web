meta({
  name: 'u-bracket',
  license: 'CC0-1.0',
  title: 'U bracket',
  description: 'Open-top channel mounting bracket with a flat back and two parallel side ears. Knobs: model size and finish colour.',
  tags: ['u bracket', 'channel bracket', 'mounting bracket', 'clevis'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 320,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('u-bracket');
a.part('back',block(-28*s,-20*s,0,56*s,40*s,5*s).color(finish));
a.part('left-ear',block(-28*s,-20*s,5*s,5*s,40*s,28*s).color(finish));
a.part('right-ear',block(23*s,-20*s,5*s,5*s,40*s,28*s).color(finish));
a.part('cross-pin',cylinder(40*s,4*s,10).rotateX(90).translate(0,20*s,19*s).color(finish));
return a.model();
