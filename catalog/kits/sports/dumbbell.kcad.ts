meta({
  name: 'dumbbell',
  license: 'CC0-1.0',
  title: 'Dumbbell',
  description: 'Compact hand weight with centre grip and paired block-shaped plates. Knobs: size, body and detail colours.',
  tags: ["dumbbell", "weight", "fitness", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 420,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#555b60', { label: 'Body' });
const trim = param('trim', '#a7adb0', { label: 'Detail' });

presets({
  classic: { body: '#555b60', trim: '#a7adb0' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('dumbbell');
a.part('handle',box(310*k,34*k,34*k,true).translate(0,0,82*k).color(body));
for(const side of [-1,1]){
 a.part('inner-plate-'+side,box(46*k,166*k,166*k,true).translate(side*92*k,0,83*k).color(trim));
 a.part('outer-plate-'+side,box(50*k,190*k,190*k,true).translate(side*138*k,0,95*k).color(body));
}
a.part('grip-ring-a',box(12*k,48*k,42*k,true).translate(-30*k,0,82*k).color(trim));
a.part('grip-ring-b',box(12*k,48*k,42*k,true).translate(30*k,0,82*k).color(trim));
return a.model();
