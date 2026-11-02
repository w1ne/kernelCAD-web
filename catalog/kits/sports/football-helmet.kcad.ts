meta({
  name: 'football-helmet',
  license: 'CC0-1.0',
  title: 'Football helmet',
  description: 'Protective shell with ear guards and a front cage of low-poly bars. Knobs: size, body and detail colours.',
  tags: ["football", "helmet", "gridiron", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 520,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#c43a34', { label: 'Body' });
const trim = param('trim', '#e4d9be', { label: 'Detail' });

presets({
  classic: { body: '#c43a34', trim: '#e4d9be' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('football-helmet');
a.part('shell',sphere(150*k).scale([1.12,.94,.7]).translate(0,0,105*k).color(body));
for(const side of [-1,1])a.part('ear-guard-'+side,box(72*k,100*k,88*k,true).translate(side*112*k,0,44*k).color(body));
a.part('facebar-top',box(230*k,18*k,18*k,true).translate(0,-150*k,143*k).color(trim));
a.part('facebar-bottom',box(170*k,18*k,18*k,true).translate(0,-160*k,68*k).color(trim));
for(const side of [-1,1])a.part('facebar-side-'+side,box(18*k,18*k,105*k,true).translate(side*98*k,-155*k,105*k).color(trim));
return a.model();
