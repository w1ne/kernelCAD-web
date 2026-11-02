meta({
  name: 'tubular-spacer',
  license: 'CC0-1.0',
  title: 'Tubular spacer',
  description: 'Short hollow cylindrical spacer with flat faces and a centered clearance bore. Knobs: model size and finish colour.',
  tags: ['spacer', 'tube spacer', 'standoff', 'hardware'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 260,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('tubular-spacer');
a.part('spacer',cylinder(16*s,14*s,12).subtract(cylinder(18*s,6*s,10).translate(0,0,-s)).color(finish));
return a.model();
