meta({
  name: 'panel-clamp',
  license: 'CC0-1.0',
  title: 'Panel clamp',
  description: 'Small edge clamp with a broad base, upright jaw and adjustable pressure pad. Knobs: model size and finish colour.',
  tags: ['panel clamp', 'edge clamp', 'mounting hardware', 'fixture'],
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
const a = assembly('panel-clamp');
a.part('base',block(-24*s,-20*s,0,48*s,40*s,6*s).color(finish));
a.part('jaw',block(-24*s,14*s,6*s,48*s,6*s,27*s).color(finish));
a.part('screw',cylinder(14*s,4*s,10).translate(0,-2*s,9*s).color(finish));
a.part('pad',block(-10*s,-8*s,20*s,20*s,16*s,5*s).color(finish));
return a.model();
