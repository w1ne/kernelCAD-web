meta({
  name: 'table-tennis-ball',
  license: 'CC0-1.0',
  title: 'Table tennis ball',
  description: 'Small lightweight ball with a contrasting service marker. Knobs: size, body and detail colours.',
  tags: ["table tennis", "ping pong", "ball", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 280,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#f2f0e8', { label: 'Body' });
const trim = param('trim', '#e87530', { label: 'Detail' });

presets({
  classic: { body: '#f2f0e8', trim: '#e87530' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('table-tennis-ball');
const R = 20 * k;
a.part('shell', sphere(R).scale([1, 1, 1]).translate(0,0,R*1).color(body));
a.part('marker',sphere(3*k).translate(0,-R-1,R).color(trim));
return a.model();
