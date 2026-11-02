meta({
  name: 'soccer-goal',
  license: 'CC0-1.0',
  title: 'Soccer goal',
  description: 'Portable goal frame with rear support rails and a low-density net grid. Knobs: size, body and detail colours.',
  tags: ["soccer", "goal", "football", "pitch", "sports"],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ["outdoor", "field", "sports"],
  triangleBudget: 850,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#f0f0e9', { label: 'Body' });
const trim = param('trim', '#6d777d', { label: 'Detail' });

presets({
  classic: { body: '#f0f0e9', trim: '#6d777d' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('soccer-goal');
const W=3000*k,H=2100*k,D=850*k,T=70*k;
for(const side of [-1,1]){
 a.part('post-'+side,box(T,T,H,true).translate(side*W/2,0,H/2).color(body));
 a.part('rear-leg-'+side,box(T,D,T,true).translate(side*(W/2-T/2),D/2,T/2).color(body));
}
a.part('crossbar',box(W+T,T,T,true).translate(0,0,H-T/2).color(body));
for(let i=0;i<=10;i++)a.part('net-vertical-'+i,box(12*k,12*k,H,true).translate(-W/2+i*W/10,D,H/2).color(trim));
for(let i=1;i<5;i++)a.part('net-horizontal-'+i,box(W,12*k,12*k,true).translate(0,D,i*H/5).color(trim));
a.part('net-depth-top',box(T,D,T,true).translate(0,D,H-T/2).color(trim));
return a.model();
