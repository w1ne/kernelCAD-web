meta({
  name: 'tennis-racket',
  license: 'CC0-1.0',
  title: 'Tennis racket',
  description: 'Oval string racket with reinforced rim, long shaft and cushioned grip. Knobs: size, body and detail colours.',
  tags: ["tennis", "racket", "court", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 650,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#4e6b50', { label: 'Body' });
const trim = param('trim', '#d8d4c7', { label: 'Detail' });

presets({
  classic: { body: '#4e6b50', trim: '#d8d4c7' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('tennis-racket');
const oval=(rx,ry,n=12)=>{let p=path().moveTo(rx,0);for(let i=1;i<n;i++){const t=2*Math.PI*i/n;p=p.lineTo(rx*Math.cos(t),ry*Math.sin(t));}return p.close();};
const outer=oval(128*k,158*k).extrude(22*k).translate(0,250*k,0),inner=oval(106*k,136*k).extrude(24*k).translate(0,250*k,-1*k);
a.part('rim',outer.subtract(inner).color(body));
for(let i=-5;i<=5;i++)a.part('string-v-'+i,box(4*k,258*k,4*k,true).translate(i*18*k,250*k,11*k).color(trim));
for(let i=-5;i<=5;i++)a.part('string-h-'+i,box(205*k,4*k,4*k,true).translate(0,250*k+i*23*k,11*k).color(trim));
a.part('shaft',box(35*k,335*k,24*k,true).translate(0,-5*k,12*k).color(body));
a.part('grip',box(52*k,190*k,30*k,true).translate(0,-265*k,15*k).color(trim));
return a.model();
