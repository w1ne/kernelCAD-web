meta({
  name: 'yoga-mat',
  license: 'CC0-1.0',
  title: 'Yoga mat',
  description: 'Rolled-end exercise mat with flat body and two carry bands. Knobs: size, body and detail colours.',
  tags: ["yoga", "mat", "fitness", "sports"],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ["indoor", "fitness", "sports"],
  triangleBudget: 400,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#47786a', { label: 'Body' });
const trim = param('trim', '#dfd9c9', { label: 'Detail' });

presets({
  classic: { body: '#47786a', trim: '#dfd9c9' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('yoga-mat');
a.part('mat',box(620*k,1780*k,16*k,true).translate(0,0,8*k).color(body));
a.part('rolled-end',cylinder(560*k,42*k).rotateX(90).translate(0,280*k,42*k).color(body));
for(const side of [-1,1])a.part('carry-band-'+side,box(34*k,620*k,20*k,true).translate(side*180*k,0,22*k).color(trim));
return a.model();
