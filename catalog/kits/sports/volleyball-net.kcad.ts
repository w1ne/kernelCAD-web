meta({
  name: 'volleyball-net',
  license: 'CC0-1.0',
  title: 'Volleyball net',
  description: 'Tall court net with tension poles, top tape and regular mesh. Knobs: size, body and detail colours.',
  tags: ["volleyball", "net", "court", "sports"],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ["outdoor", "court", "sports"],
  triangleBudget: 950,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#f0eee6', { label: 'Body' });
const trim = param('trim', '#687078', { label: 'Detail' });

presets({
  classic: { body: '#f0eee6', trim: '#687078' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('volleyball-net');
const W=9000*k,H=2400*k;
for(const side of [-1,1]){
 a.part('pole-'+side,cylinder(H,46*k).translate(side*W/2,0,0).color(trim));
 a.part('foot-'+side,box(300*k,100*k,34*k,true).translate(side*W/2,0,17*k).color(trim));
}
a.part('top-tape',box(W,48*k,54*k,true).translate(0,0,H-27*k).color(trim));
a.part('bottom-tape',box(W,35*k,35*k,true).translate(0,0,18*k).color(trim));
for(let i=-7;i<=7;i++)a.part('mesh-v-'+i,box(8*k,8*k,H-90*k,true).translate(i*W/14,0,H/2).color(body));
for(let i=1;i<8;i++)a.part('mesh-h-'+i,box(W,8*k,8*k,true).translate(0,0,i*H/8).color(body));
return a.model();
