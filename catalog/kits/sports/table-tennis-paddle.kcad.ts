meta({
  name: 'table-tennis-paddle',
  license: 'CC0-1.0',
  title: 'Table tennis paddle',
  description: 'Solid oval paddle face with a narrow neck and contrasting handle scales. Knobs: size, body and detail colours.',
  tags: ["table tennis", "ping pong", "paddle", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 320,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#c54737', { label: 'Body' });
const trim = param('trim', '#6a4634', { label: 'Detail' });

presets({
  classic: { body: '#c54737', trim: '#6a4634' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('table-tennis-paddle');
const oval=(rx,ry,n=10)=>{let p=path().moveTo(rx,0);for(let i=1;i<n;i++){const t=2*Math.PI*i/n;p=p.lineTo(rx*Math.cos(t),ry*Math.sin(t));}return p.close();};
a.part('rubber-face',oval(105*k,130*k).extrude(18*k).translate(0,150*k,0).color(body));
a.part('wood-handle',box(74*k,240*k,18*k,true).translate(0,-210*k,9*k).color(trim));
a.part('handle-cap',box(92*k,38*k,22*k,true).translate(0,-344*k,11*k).color(body));
return a.model();
