meta({
  name: 'cable-clamp',
  license: 'CC0-1.0',
  title: 'Cable clamp',
  description: 'Low-profile cable saddle with two fixing ears and a rounded cable guide. Knobs: model size and finish colour.',
  tags: ['cable clamp', 'wire clamp', 'strain relief', 'electrical'],
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
const a = assembly('cable-clamp');
a.part('foot',block(-24*s,-17*s,0,48*s,34*s,4*s).color(finish));
a.part('saddle',cylinder(8*s,15*s,12).subtract(cylinder(10*s,10*s,12).translate(0,0,-s)).translate(0,0,4*s).color(finish));
a.part('ear-left',block(-24*s,-17*s,0,8*s,34*s,7*s).color(finish));
a.part('ear-right',block(16*s,-17*s,0,8*s,34*s,7*s).color(finish));
return a.model();
