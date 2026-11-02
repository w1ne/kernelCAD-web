meta({
  name: 'hurdle',
  license: 'CC0-1.0',
  title: 'Track hurdle',
  description: 'Adjustable training hurdle with feet, uprights and a contrasting crossbar. Knobs: size, body and detail colours.',
  tags: ["hurdle", "track", "athletics", "sports"],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ["outdoor", "track", "sports"],
  triangleBudget: 350,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#77828a', { label: 'Body' });
const trim = param('trim', '#e6ad32', { label: 'Detail' });

presets({
  classic: { body: '#77828a', trim: '#e6ad32' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('hurdle');
for(const side of [-1,1]){
 a.part('foot-'+side,box(520*k,125*k,42*k,true).translate(side*265*k,0,21*k).color(body));
 a.part('upright-'+side,box(40*k,42*k,710*k,true).translate(side*255*k,0,376*k).color(body));
}
a.part('crossbar',box(560*k,62*k,42*k,true).translate(0,0,740*k).color(trim));
return a.model();
