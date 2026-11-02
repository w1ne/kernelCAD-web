meta({
  name: 'rubber-bumper',
  license: 'CC0-1.0',
  title: 'Rubber bumper',
  description: 'Low-profile cylindrical vibration bumper with a flat base and centered mounting stem. Knobs: model size and finish colour.',
  tags: ['rubber bumper', 'vibration mount', 'foot', 'isolation'],
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
const a = assembly('rubber-bumper');
a.part('base',cylinder(12*s,18*s,12).translate(0,0,0).color(finish));
a.part('crown',cylinder(5*s,15*s,12).translate(0,0,12*s).color(finish));
a.part('stem',cylinder(12*s,5*s,10).translate(0,0,17*s).color(finish));
return a.model();
