meta({
  name: 'rugby-ball',
  license: 'CC0-1.0',
  title: 'Rugby ball',
  description: 'Long oval ball with contrasting end panels and a raised lace line. Knobs: size, body and detail colours.',
  tags: ["rugby", "ball", "oval", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 400,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#8b4f31', { label: 'Body' });
const trim = param('trim', '#efe6d3', { label: 'Detail' });

presets({
  classic: { body: '#8b4f31', trim: '#efe6d3' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('rugby-ball');
const R = 118 * k;
a.part('shell', sphere(R).scale([1.42, 0.78, 0.78]).translate(0,0,R*0.78).color(body));

a.part('lace-strip',box(94*k,7*k,6*k,true).translate(0,0,R*1.53).color(trim));
for(let i=-2;i<=2;i++) a.part('lace-'+(i+2),box(5*k,23*k,5*k,true).translate(i*15*k,0,R*1.55).color(trim));
return a.model();
