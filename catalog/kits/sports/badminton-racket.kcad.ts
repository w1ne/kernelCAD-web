meta({
  name: 'badminton-racket',
  license: 'CC0-1.0',
  title: 'Badminton racket',
  description: 'Light oval racket with a string grid, long shaft and wrapped handle. Knobs: size, body and detail colours.',
  tags: ["badminton", "racket", "shuttlecock", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 650,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#30343a', { label: 'Body' });
const trim = param('trim', '#c74d3c', { label: 'Detail' });

presets({
  classic: { body: '#30343a', trim: '#c74d3c' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('badminton-racket');
const oval=(rx,ry,n=12)=>{let p=path().moveTo(rx,0);for(let i=1;i<n;i++){const t=2*Math.PI*i/n;p=p.lineTo(rx*Math.cos(t),ry*Math.sin(t));}return p.close();};
const outer=oval(100*k,145*k).extrude(16*k).translate(0,245*k,0),inner=oval(82*k,127*k).extrude(18*k).translate(0,245*k,-1*k);
a.part('frame',outer.subtract(inner).color(body));
for(let i=-4;i<=4;i++)a.part('string-v-'+i,box(3*k,225*k,4*k,true).translate(i*17*k,245*k,8*k).color(trim));
for(let i=-4;i<=4;i++)a.part('string-h-'+i,box(155*k,3*k,4*k,true).translate(0,245*k+i*24*k,8*k).color(trim));
a.part('shaft',box(22*k,300*k,18*k,true).translate(0,-10*k,9*k).color(body));
a.part('grip',box(34*k,190*k,22*k,true).translate(0,-220*k,11*k).color(trim));
return a.model();
