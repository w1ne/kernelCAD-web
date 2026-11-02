meta({
  name: 'softball',
  license: 'CC0-1.0',
  title: 'Softball',
  description: 'Bright yellow ball with two curved rows of red raised stitch marks. Knobs: size, body and detail colours.',
  tags: ["softball", "ball", "diamond", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 500,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#e7d32d', { label: 'Body' });
const trim = param('trim', '#b93232', { label: 'Detail' });

presets({
  classic: { body: '#e7d32d', trim: '#b93232' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('softball');
const R = 102 * k;
a.part('shell', sphere(R).scale([1, 1, 1]).translate(0,0,R*1).color(body));

for(let i=-3;i<=3;i++){
 const x=i*R*.17,v=(i*i-3)*R*.07,y=-Math.sqrt(Math.max(0,R*R-x*x-v*v))-2;
 a.part('stitch-'+(i+3),box(9*k,4*k,5*k,true).rotateY(i*5).translate(x,y,R+v).color(trim));
 a.part('stitch-mirror-'+(i+3),box(9*k,4*k,5*k,true).rotateY(-i*5).translate(-x,y,R-v).color(trim));
}
return a.model();
