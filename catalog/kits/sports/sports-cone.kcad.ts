meta({
  name: 'sports-cone',
  license: 'CC0-1.0',
  title: 'Training cone',
  description: 'Stackable tapered field cone with a wide foot and reflective bands. Knobs: size, body and detail colours.',
  tags: ["cone", "training", "field", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 350,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#e86c2e', { label: 'Body' });
const trim = param('trim', '#f2e3c4', { label: 'Detail' });

presets({
  classic: { body: '#e86c2e', trim: '#f2e3c4' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('sports-cone');
const square=w=>path().moveTo(-w,-w).lineTo(w,-w).lineTo(w,w).lineTo(-w,w).close();
a.part('foot',box(310*k,310*k,24*k,true).translate(0,0,12*k).color(body));
a.part('cone',square(128*k).loft(square(24*k),{spacing:350*k,ruled:true}).translate(0,0,24*k).color(body));
a.part('band-low',box(130*k,130*k,20*k,true).translate(0,0,130*k).color(trim));
a.part('band-high',box(80*k,80*k,18*k,true).translate(0,0,244*k).color(trim));
return a.model();
