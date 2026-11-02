meta({
  name: 'bulkhead-adapter',
  license: 'CC0-1.0',
  title: 'Bulkhead adapter',
  description: 'Hollow through-wall adapter with a tube barrel and a flange on each side. Knobs: model size and finish colour.',
  tags: ['bulkhead adapter', 'panel fitting', 'pipe adapter', 'connector'],
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
const a = assembly('bulkhead-adapter');
a.part('barrel',cylinder(30*s,12*s,12).subtract(cylinder(32*s,8*s,12).translate(0,0,-s)).color(finish));
a.part('lower-flange',cylinder(5*s,21*s,14).subtract(cylinder(7*s,8*s,12).translate(0,0,-s)).color(finish));
a.part('upper-flange',cylinder(5*s,21*s,14).subtract(cylinder(7*s,8*s,12).translate(0,0,-s)).translate(0,0,25*s).color(finish));
return a.model();
