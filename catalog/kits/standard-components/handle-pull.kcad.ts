meta({
  name: 'handle-pull',
  license: 'CC0-1.0',
  title: 'Handle pull',
  description: 'Raised U-shaped cabinet pull with two mounting feet and a straight grip bar. Knobs: model size and finish colour.',
  tags: ['pull handle', 'cabinet handle', 'grab handle', 'hardware'],
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
const a = assembly('handle-pull');
a.part('foot-left',cylinder(4*s,8*s,12).translate(-22*s,0,0).color(finish));
a.part('foot-right',cylinder(4*s,8*s,12).translate(22*s,0,0).color(finish));
a.part('post-left',cylinder(28*s,4*s,10).translate(-22*s,0,4*s).color(finish));
a.part('post-right',cylinder(28*s,4*s,10).translate(22*s,0,4*s).color(finish));
a.part('grip',cylinder(44*s,5*s,12).rotateY(90).translate(-22*s,0,30*s).color(finish));
return a.model();
