meta({
  name: 'weight-plate',
  license: 'CC0-1.0',
  title: 'Weight plate',
  description: 'Flat annular gym plate with a large centre bore and raised rim. Knobs: size, body and detail colours.',
  tags: ["weight plate", "barbell", "gym", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 300,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#4b5055', { label: 'Body' });
const trim = param('trim', '#a9afb2', { label: 'Detail' });

presets({
  classic: { body: '#4b5055', trim: '#a9afb2' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('weight-plate');
const plate=cylinder(34*k,128*k).subtract(cylinder(36*k,29*k).translate(0,0,-1*k));
a.part('plate',plate.color(body));
a.part('rim',cylinder(8*k,132*k).subtract(cylinder(10*k,118*k).translate(0,0,-1*k)).translate(0,0,13*k).color(trim));
return a.model();
