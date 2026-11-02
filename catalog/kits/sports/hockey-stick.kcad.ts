meta({
  name: 'hockey-stick',
  license: 'CC0-1.0',
  title: 'Field hockey stick',
  description: 'Straight shaft with a low-poly angled blade and contrasting grip wrap. Knobs: size, body and detail colours.',
  tags: ["field hockey", "stick", "hockey", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 350,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#936a43', { label: 'Body' });
const trim = param('trim', '#d7d1c3', { label: 'Detail' });

presets({
  classic: { body: '#936a43', trim: '#d7d1c3' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('hockey-stick');
a.part('shaft',box(38*k,840*k,38*k,true).translate(0,410*k,19*k).color(body));
a.part('grip',box(46*k,200*k,44*k,true).translate(0,80*k,22*k).color(trim));
a.part('blade-neck',box(54*k,145*k,38*k,true).translate(0,830*k,19*k).color(body));
a.part('blade-toe',box(70*k,170*k,38*k,true).rotateZ(22).translate(48*k,930*k,19*k).color(trim));
return a.model();
