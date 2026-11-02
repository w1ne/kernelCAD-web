meta({
  name: 'handball',
  license: 'CC0-1.0',
  title: 'Handball',
  description: 'Compact court ball with two raised wraparound panel bands. Knobs: size, body and detail colours.',
  tags: ["handball", "ball", "indoor", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 450,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#e7a92c', { label: 'Body' });
const trim = param('trim', '#2e578b', { label: 'Detail' });

presets({
  classic: { body: '#e7a92c', trim: '#2e578b' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('handball');
const R = 88 * k;
a.part('shell', sphere(R).scale([1, 1, 1]).translate(0,0,R*1).color(body));

const band=()=>cylinder(5*k,R+2*k).subtract(cylinder(7*k,R-3*k).translate(0,0,-1));
a.part('panel-band-a',band().translate(0,0,R-2*k).color(trim));
a.part('panel-band-b',band().rotateX(90).translate(0,0,R+3*k).color(trim));
return a.model();
