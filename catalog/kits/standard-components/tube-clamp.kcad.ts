meta({
  name: 'tube-clamp',
  license: 'CC0-1.0',
  title: 'Tube clamp',
  description: 'Compact two-hole clamp block with a semicircular tube seat and a top retainer bridge. Knobs: model size and finish colour.',
  tags: ['tube clamp', 'pipe clamp', 'retainer', 'mount'],
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
const a = assembly('tube-clamp');
a.part('base',block(-26*s,-18*s,0,52*s,36*s,7*s).color(finish));
a.part('left-cheek',block(-26*s,-18*s,7*s,10*s,36*s,17*s).color(finish));
a.part('right-cheek',block(16*s,-18*s,7*s,10*s,36*s,17*s).color(finish));
a.part('bridge',block(-16*s,-18*s,19*s,32*s,36*s,5*s).color(finish));
return a.model();
