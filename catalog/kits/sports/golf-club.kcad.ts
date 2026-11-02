meta({
  name: 'golf-club',
  license: 'CC0-1.0',
  title: 'Golf club',
  description: 'Long-shafted club with rubber grip and a broad low-profile iron head. Knobs: size, body and detail colours.',
  tags: ["golf", "club", "iron", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 350,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#777f83', { label: 'Body' });
const trim = param('trim', '#315e48', { label: 'Detail' });

presets({
  classic: { body: '#777f83', trim: '#315e48' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('golf-club');
a.part('shaft',box(26*k,790*k,26*k,true).translate(0,390*k,13*k).color(body));
a.part('grip',box(38*k,180*k,36*k,true).translate(0,80*k,18*k).color(trim));
a.part('hosel',box(28*k,75*k,42*k,true).translate(12*k,760*k,21*k).color(body));
const head=path().moveTo(-82*k,735*k).lineTo(93*k,755*k).lineTo(110*k,850*k).lineTo(-62*k,872*k).close();
a.part('club-head',head.extrude(52*k).color(trim));
return a.model();
