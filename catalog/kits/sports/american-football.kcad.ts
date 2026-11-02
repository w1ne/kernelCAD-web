meta({
  name: 'american-football',
  license: 'CC0-1.0',
  title: 'American football',
  description: 'Elliptical game ball with contrasting end bands and a raised lace strip. Knobs: size, body and detail colours.',
  tags: ["american football", "gridiron", "ball", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 500,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#7d4b2c', { label: 'Body' });
const trim = param('trim', '#f2eee1', { label: 'Detail' });

presets({
  classic: { body: '#7d4b2c', trim: '#f2eee1' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('american-football');
const R = 125 * k;
a.part('shell', sphere(R).scale([1.55, 0.8, 0.8]).translate(0,0,R*0.8).color(body));

a.part('lace-strip',box(110*k,8*k,6*k,true).translate(0,0,R*1.57).color(trim));
for(let i=-3;i<=3;i++) a.part('lace-'+(i+3),box(6*k,28*k,5*k,true).translate(i*15*k,0,R*1.59).color(trim));
for(const side of [-1,1]) a.part('end-band-'+side,box(12*k,145*k,145*k,true).translate(side*R*1.13,0,R*.8).color(trim));
return a.model();
