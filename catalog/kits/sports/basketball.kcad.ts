meta({
  name: 'basketball',
  license: 'CC0-1.0',
  title: 'Basketball',
  description: 'Orange faceted ball with three dark raised equator and meridian seams. Knobs: size, body and detail colours.',
  tags: ["basketball", "ball", "court", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 500,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#d87528', { label: 'Body' });
const trim = param('trim', '#292a2c', { label: 'Detail' });

presets({
  classic: { body: '#d87528', trim: '#292a2c' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('basketball');
const R = 120 * k;
a.part('shell', sphere(R).scale([1, 1, 1]).translate(0,0,R*1).color(body));

const ring=()=>cylinder(7*k,R+3*k).subtract(cylinder(9*k,R-4*k).translate(0,0,-1));
a.part('equator-seam',ring().translate(0,0,R-3*k).color(trim));
a.part('meridian-x',ring().rotateX(90).translate(0,0,R+4*k).color(trim));
a.part('meridian-y',ring().rotateY(90).translate(0,0,R+4*k).color(trim));
return a.model();
