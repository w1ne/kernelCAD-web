meta({
  name: 'trophy-cup',
  license: 'CC0-1.0',
  title: 'Trophy cup',
  description: 'Two-handled award cup on a narrow stem and broad stepped pedestal. Knobs: size, body and detail colours.',
  tags: ["trophy", "cup", "award", "podium", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 520,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#d4a433', { label: 'Body' });
const trim = param('trim', '#70512b', { label: 'Detail' });

presets({
  classic: { body: '#d4a433', trim: '#70512b' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('trophy-cup');
a.part('base',box(210*k,150*k,42*k,true).translate(0,0,21*k).color(body));
a.part('plinth',box(155*k,115*k,42*k,true).translate(0,0,63*k).color(trim));
a.part('stem',cylinder(105*k,31*k).translate(0,0,84*k).color(body));
const bowl=cylinder(120*k,125*k).subtract(cylinder(122*k,103*k).translate(0,0,-1*k));
a.part('bowl',bowl.translate(0,0,189*k).color(body));
for(const side of [-1,1])a.part('handle-'+side,box(30*k,105*k,115*k,true).translate(side*137*k,0,240*k).color(trim));
return a.model();
