meta({
  name: 'baseball-bat',
  license: 'CC0-1.0',
  title: 'Baseball bat',
  description: 'Tapered bat with enlarged barrel, narrow wrapped grip and end knob. Knobs: size, body and detail colours.',
  tags: ["baseball", "bat", "equipment", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 350,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#9b6840', { label: 'Body' });
const trim = param('trim', '#d7c5a1', { label: 'Detail' });

presets({
  classic: { body: '#9b6840', trim: '#d7c5a1' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('baseball-bat');
a.part('barrel',box(76*k,420*k,76*k,true).translate(0,360*k,38*k).color(body));
a.part('taper',box(52*k,220*k,52*k,true).translate(0,40*k,26*k).color(body));
a.part('grip-wrap',box(48*k,180*k,48*k,true).translate(0,-90*k,24*k).color(trim));
a.part('knob',box(62*k,48*k,52*k,true).translate(0,-204*k,26*k).color(body));
return a.model();
