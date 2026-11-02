meta({
  name: 'fencing-foil',
  license: 'CC0-1.0',
  title: 'Fencing foil',
  description: 'Slim foil with round guard, narrow blade, grip and padded pommel. Knobs: size, body and detail colours.',
  tags: ["fencing", "foil", "blade", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 450,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#848b91', { label: 'Body' });
const trim = param('trim', '#4d6d4e', { label: 'Detail' });

presets({
  classic: { body: '#848b91', trim: '#4d6d4e' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('fencing-foil');
const guard=cylinder(18*k,88*k).subtract(cylinder(20*k,38*k).translate(0,0,-1*k));
a.part('guard',guard.rotateX(90).translate(0,0,88*k).color(body));
a.part('blade',box(16*k,920*k,14*k,true).translate(0,470*k,7*k).color(body));
a.part('grip',box(38*k,180*k,34*k,true).translate(0,-115*k,17*k).color(trim));
a.part('pommel',cylinder(24*k,24*k).color(body));
a.part('tip',sphere(13*k).translate(0,934*k,13*k).color(trim));
return a.model();
