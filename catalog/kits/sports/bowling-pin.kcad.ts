meta({
  name: 'bowling-pin',
  license: 'CC0-1.0',
  title: 'Bowling pin',
  description: 'White pin with a narrow neck and two colored neck bands. Knobs: size, body and detail colours.',
  tags: ["bowling", "pin", "lane", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 500,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#f2f0e8', { label: 'Body' });
const trim = param('trim', '#d23832', { label: 'Detail' });

presets({
  classic: { body: '#f2f0e8', trim: '#d23832' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('bowling-pin');
a.part('base',cylinder(44*k,48*k).color(body));
a.part('belly',sphere(62*k).scale([.8,.8,1]).translate(0,0,62*k).color(body));
a.part('neck',cylinder(76*k,25*k).translate(0,0,105*k).color(body));
a.part('head',sphere(29*k).translate(0,0,205*k).color(body));
a.part('band-lower',cylinder(8*k,28*k).translate(0,0,137*k).color(trim));
a.part('band-upper',cylinder(8*k,27*k).translate(0,0,151*k).color(trim));
return a.model();
