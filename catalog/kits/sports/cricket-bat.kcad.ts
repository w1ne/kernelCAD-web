meta({
  name: 'cricket-bat',
  license: 'CC0-1.0',
  title: 'Cricket bat',
  description: 'Flat broad blade, raised shoulder and fabric-wrapped handle. Knobs: size, body and detail colours.',
  tags: ["cricket", "bat", "wicket", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 350,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#b88750', { label: 'Body' });
const trim = param('trim', '#513d31', { label: 'Detail' });

presets({
  classic: { body: '#b88750', trim: '#513d31' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('cricket-bat');
const blade=path().moveTo(-75*k,0).lineTo(75*k,0).lineTo(105*k,440*k).lineTo(92*k,510*k).lineTo(-92*k,510*k).lineTo(-105*k,440*k).close();
a.part('blade',blade.extrude(32*k).color(body));
a.part('shoulder',box(170*k,100*k,34*k,true).translate(0,500*k,17*k).color(body));
a.part('handle',box(48*k,300*k,44*k,true).translate(0,690*k,22*k).color(trim));
a.part('grip-cap',box(60*k,44*k,50*k,true).translate(0,842*k,25*k).color(body));
return a.model();
