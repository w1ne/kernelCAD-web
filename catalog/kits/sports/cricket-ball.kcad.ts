meta({
  name: 'cricket-ball',
  license: 'CC0-1.0',
  title: 'Cricket ball',
  description: 'Red cricket ball with a raised pale seam around its crown. Knobs: size, body and detail colours.',
  tags: ["cricket", "ball", "wicket", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 350,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#9f2928', { label: 'Body' });
const trim = param('trim', '#e9dfc8', { label: 'Detail' });

presets({
  classic: { body: '#9f2928', trim: '#e9dfc8' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('cricket-ball');
const R = 94 * k;
a.part('shell', sphere(R).scale([1, 1, 1]).translate(0,0,R*1).color(body));

const seam=cylinder(7*k,R+3*k).subtract(cylinder(9*k,R-4*k).translate(0,0,-1));
a.part('raised-seam',seam.translate(0,0,R-3*k).color(trim));
return a.model();
