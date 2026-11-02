meta({
  name: 'barbell',
  license: 'CC0-1.0',
  title: 'Barbell',
  description: 'Straight lifting bar with paired thick block plates and collars. Knobs: size, body and detail colours.',
  tags: ["barbell", "weight", "gym", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 450,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#686f74', { label: 'Body' });
const trim = param('trim', '#33383d', { label: 'Detail' });

presets({
  classic: { body: '#686f74', trim: '#33383d' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('barbell');
a.part('bar',box(1450*k,38*k,38*k,true).translate(0,0,135*k).color(body));
for(const side of [-1,1]){
 a.part('inner-plate-'+side,box(72*k,220*k,220*k,true).translate(side*280*k,0,110*k).color(trim));
 a.part('outer-plate-'+side,box(92*k,280*k,280*k,true).translate(side*365*k,0,140*k).color(body));
 a.part('collar-'+side,box(38*k,64*k,64*k,true).translate(side*225*k,0,135*k).color(trim));
}
return a.model();
