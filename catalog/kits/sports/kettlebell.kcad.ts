meta({
  name: 'kettlebell',
  license: 'CC0-1.0',
  title: 'Kettlebell',
  description: 'Rounded training weight with squared arch handle and side supports. Knobs: size, body and detail colours.',
  tags: ["kettlebell", "weight", "fitness", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 450,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#4b5055', { label: 'Body' });
const trim = param('trim', '#c2c5c6', { label: 'Detail' });

presets({
  classic: { body: '#4b5055', trim: '#c2c5c6' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('kettlebell');
a.part('weight',sphere(100*k).scale([1,.88,1]).translate(0,0,100*k).color(body));
a.part('handle-left',box(28*k,36*k,86*k,true).translate(-55*k,0,190*k).color(trim));
a.part('handle-right',box(28*k,36*k,86*k,true).translate(55*k,0,190*k).color(trim));
a.part('handle-top',box(138*k,36*k,34*k,true).translate(0,0,250*k).color(trim));
a.part('badge',box(70*k,12*k,48*k,true).translate(0,-88*k,112*k).color(trim));
return a.model();
