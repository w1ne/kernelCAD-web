meta({
  name: 'medicine-ball',
  license: 'CC0-1.0',
  title: 'Medicine ball',
  description: 'Weighted training ball with two raised grip bands and a centre badge. Knobs: size, body and detail colours.',
  tags: ["medicine ball", "fitness", "training", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 520,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#3f6286', { label: 'Body' });
const trim = param('trim', '#e59a36', { label: 'Detail' });

presets({
  classic: { body: '#3f6286', trim: '#e59a36' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('medicine-ball');
const R = 118 * k;
a.part('shell', sphere(R).scale([1, 1, 1]).translate(0,0,R*1).color(body));

const band=()=>cylinder(8*k,R+2*k).subtract(cylinder(10*k,R-4*k).translate(0,0,-1));
a.part('grip-band-a',band().translate(0,0,R-4*k).color(trim));
a.part('grip-band-b',band().rotateX(90).translate(0,0,R+3*k).color(trim));
a.part('badge',sphere(15*k).translate(0,-R-1,R).color(trim));
return a.model();
