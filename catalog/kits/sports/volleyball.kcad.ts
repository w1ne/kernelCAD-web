meta({
  name: 'volleyball',
  license: 'CC0-1.0',
  title: 'Volleyball',
  description: 'Light court ball with three raised curved panel bands in blue. Knobs: size, body and detail colours.',
  tags: ["volleyball", "ball", "court", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 520,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#f1f0e7', { label: 'Body' });
const trim = param('trim', '#3175b7', { label: 'Detail' });

presets({
  classic: { body: '#f1f0e7', trim: '#3175b7' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('volleyball');
const R = 108 * k;
a.part('shell', sphere(R).scale([1, 1, 1]).translate(0,0,R*1).color(body));

const band=()=>cylinder(6*k,R+3*k).subtract(cylinder(8*k,R-4*k).translate(0,0,-1));
a.part('panel-a',band().translate(0,0,R-3*k).color(trim));
a.part('panel-b',band().rotateX(90).translate(0,0,R+4*k).color(trim));
a.part('panel-c',band().rotateY(90).translate(0,0,R+4*k).color(trim));
return a.model();
