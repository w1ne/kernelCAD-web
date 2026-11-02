meta({
  name: 'tennis-net',
  license: 'CC0-1.0',
  title: 'Tennis net',
  description: 'Freestanding court net with two posts, tension rails and sparse mesh. Knobs: size, body and detail colours.',
  tags: ["tennis", "net", "court", "sports"],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ["outdoor", "court", "sports"],
  triangleBudget: 850,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#f0eee5', { label: 'Body' });
const trim = param('trim', '#647078', { label: 'Detail' });

presets({
  classic: { body: '#f0eee5', trim: '#647078' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('tennis-net');
const W=12000*k,H=920*k;
for(const side of [-1,1]){
 a.part('post-'+side,cylinder(1120*k,38*k).translate(side*W/2,0,0).color(trim));
 a.part('foot-'+side,box(220*k,90*k,34*k,true).translate(side*W/2,0,17*k).color(trim));
}
a.part('top-tape',box(W,42*k,46*k,true).translate(0,0,H-23*k).color(trim));
for(let i=-8;i<=8;i++)a.part('mesh-v-'+i,box(8*k,8*k,H-46*k,true).translate(i*W/16,0,(H-46*k)/2).color(body));
for(let i=1;i<5;i++)a.part('mesh-h-'+i,box(W,8*k,8*k,true).translate(0,0,i*H/5).color(body));
return a.model();
