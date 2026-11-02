meta({
  name: 't-slot-angle-bracket',
  license: 'CC0-1.0',
  title: 'T-slot angle bracket',
  description: 'Compact external corner bracket for joining two perpendicular framing profiles. Knobs: model size and finish colour.',
  tags: ['t-slot', 'angle bracket', 'frame connector', 'extrusion'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 380,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('t-slot-angle-bracket');
a.part('base',block(-24*s,-20*s,0,48*s,40*s,5*s).color(finish));
a.part('upright',block(-24*s,15*s,5*s,48*s,5*s,34*s).color(finish));
a.part('web-a',extrudePolygon([[-20*s,0],[0,0],[0,24*s]],4*s).rotateX(90).translate(-18*s,15*s,5*s).color(finish));
a.part('web-b',extrudePolygon([[0,0],[20*s,0],[0,24*s]],4*s).rotateX(90).translate(14*s,15*s,5*s).color(finish));
return a.model();
