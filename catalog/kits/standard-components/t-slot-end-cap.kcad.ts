meta({
  name: 't-slot-end-cap',
  license: 'CC0-1.0',
  title: 'T-slot end cap',
  description: 'Square profile end cap with a shallow face and four short locating ribs. Knobs: model size and finish colour.',
  tags: ['t-slot end cap', 'profile cap', 'extrusion accessory', 'frame'],
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
const a = assembly('t-slot-end-cap');
a.part('cap',block(-22*s,-22*s,0,44*s,44*s,5*s).color(finish));
for (const x of [-14,14]) for (const y of [-14,14]) a.part(`rib-${x}-${y}`,block((x-2)*s,(y-2)*s,5*s,4*s,4*s,9*s).color(finish));
return a.model();
