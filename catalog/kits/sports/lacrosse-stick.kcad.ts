meta({
  name: 'lacrosse-stick',
  license: 'CC0-1.0',
  title: 'Lacrosse stick',
  description: 'Long shaft with broad open head and a simple crossing pocket grid. Knobs: size, body and detail colours.',
  tags: ["lacrosse", "stick", "field", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 550,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#525a60', { label: 'Body' });
const trim = param('trim', '#e4dfd1', { label: 'Detail' });

presets({
  classic: { body: '#525a60', trim: '#e4dfd1' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('lacrosse-stick');
const oval=(rx,ry,n=12)=>{let p=path().moveTo(rx,0);for(let i=1;i<n;i++){const t=2*Math.PI*i/n;p=p.lineTo(rx*Math.cos(t),ry*Math.sin(t));}return p.close();};
const outer=oval(115*k,165*k).extrude(20*k).translate(0,620*k,0),inner=oval(91*k,142*k).extrude(22*k).translate(0,620*k,-1*k);
a.part('head-frame',outer.subtract(inner).color(body));
a.part('shaft',box(32*k,780*k,28*k,true).translate(0,250*k,14*k).color(body));
for(let i=-3;i<=3;i++)a.part('pocket-v-'+i,box(3*k,250*k,4*k,true).translate(i*24*k,620*k,10*k).color(trim));
for(let i=-2;i<=2;i++)a.part('pocket-h-'+i,box(178*k,3*k,4*k,true).translate(0,620*k+i*28*k,10*k).color(trim));
return a.model();
