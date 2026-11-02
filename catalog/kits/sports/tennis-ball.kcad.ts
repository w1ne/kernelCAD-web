meta({
  name: 'tennis-ball',
  license: 'CC0-1.0',
  title: 'Tennis ball',
  description: 'Lime court ball with two raised curved white seam bands. Knobs: size, body and detail colours.',
  tags: ["tennis", "ball", "court", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 450,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#c9dc43', { label: 'Body' });
const trim = param('trim', '#f4f0dc', { label: 'Detail' });

presets({
  classic: { body: '#c9dc43', trim: '#f4f0dc' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('tennis-ball');
const R = 84 * k;
a.part('shell', sphere(R).scale([1, 1, 1]).translate(0,0,R*1).color(body));

const band=()=>cylinder(5*k,R+3*k).subtract(cylinder(7*k,R-3*k).translate(0,0,-1));
a.part('seam-a',band().translate(0,0,R-2*k).color(trim));
a.part('seam-b',band().rotateX(90).translate(0,0,R+4*k).color(trim));
return a.model();
