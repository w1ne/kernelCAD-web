meta({
  name: 'medal',
  license: 'CC0-1.0',
  title: 'Sports medal',
  description: 'Round hanging medal with raised front disc and two-color neck ribbon. Knobs: size, body and detail colours.',
  tags: ["medal", "award", "podium", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 350,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#c99428', { label: 'Body' });
const trim = param('trim', '#456c9c', { label: 'Detail' });

presets({
  classic: { body: '#c99428', trim: '#456c9c' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('medal');
a.part('medallion',cylinder(18*k,66*k).rotateX(90).translate(0,0,66*k).color(body));
a.part('centre',cylinder(8*k,38*k).rotateX(90).translate(0,-10*k,72*k).color(trim));
a.part('ribbon-left',box(36*k,24*k,92*k,true).rotateZ(-10).translate(-25*k,0,158*k).color(trim));
a.part('ribbon-right',box(36*k,24*k,92*k,true).rotateZ(10).translate(25*k,0,158*k).color(body));
return a.model();
