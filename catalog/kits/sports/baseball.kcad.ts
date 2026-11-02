meta({
  name: 'baseball',
  license: 'CC0-1.0',
  title: 'Baseball',
  description: 'White stitched ball with paired red seam marks around its curved front. Knobs: size, body and detail colours.',
  tags: ["baseball", "ball", "diamond", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 500,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#f4f1e8', { label: 'Body' });
const trim = param('trim', '#b93232', { label: 'Detail' });

presets({
  classic: { body: '#f4f1e8', trim: '#b93232' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('baseball');
const R = 92 * k;
a.part('shell', sphere(R).scale([1, 1, 1]).translate(0,0,R*1).color(body));

for(let i=-3;i<=3;i++){
 const x=i*R*.18,v=(i*i-3)*R*.075,y=-Math.sqrt(Math.max(0,R*R-x*x-v*v))-2;
 a.part('seam-left-'+(i+3),box(8*k,4*k,5*k,true).rotateY(-24).translate(x,y,R+v).color(trim));
 a.part('seam-right-'+(i+3),box(8*k,4*k,5*k,true).rotateY(24).translate(-x,y,R-v).color(trim));
}
return a.model();
