meta({
  name: 'stopwatch',
  license: 'CC0-1.0',
  title: 'Stopwatch',
  description: 'Handheld timer with squared case, two buttons and large dial. Knobs: size, body and detail colours.',
  tags: ["stopwatch", "timer", "track", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 420,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#555d64', { label: 'Body' });
const trim = param('trim', '#e4a62f', { label: 'Detail' });

presets({
  classic: { body: '#555d64', trim: '#e4a62f' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('stopwatch');
a.part('case',box(154*k,42*k,185*k,true).translate(0,0,92.5*k).color(body));
a.part('dial',cylinder(12*k,57*k).rotateX(90).translate(0,-26*k,112*k).color(trim));
a.part('dial-centre',cylinder(8*k,8*k).rotateX(90).translate(0,-34*k,112*k).color(body));
a.part('button-left',box(34*k,46*k,24*k,true).translate(-42*k,0,198*k).color(trim));
a.part('button-right',box(34*k,46*k,24*k,true).translate(42*k,0,198*k).color(trim));
a.part('lanyard-loop',box(54*k,24*k,38*k,true).translate(0,0,220*k).color(body));
return a.model();
