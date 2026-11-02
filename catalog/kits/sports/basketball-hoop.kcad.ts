meta({
  name: 'basketball-hoop',
  license: 'CC0-1.0',
  title: 'Basketball hoop',
  description: 'Freestanding practice hoop with weighted base, backboard, rim and net. Knobs: size, body and detail colours.',
  tags: ["basketball", "hoop", "backboard", "court", "sports"],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ["outdoor", "court", "sports"],
  triangleBudget: 850,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#70777c', { label: 'Body' });
const trim = param('trim', '#e26f29', { label: 'Detail' });

presets({
  classic: { body: '#70777c', trim: '#e26f29' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('basketball-hoop');
a.part('base',box(1050*k,680*k,90*k,true).translate(0,60*k,45*k).color(body));
a.part('upright',box(100*k,100*k,2350*k,true).translate(0,180*k,1265*k).color(body));
a.part('backboard',box(1800*k,80*k,1000*k,true).translate(0,260*k,2390*k).color(trim));
a.part('board-mark',box(500*k,16*k,300*k,true).translate(0,215*k,2180*k).color(body));
const rim=cylinder(12*k,245*k).subtract(cylinder(14*k,204*k).translate(0,0,-1*k));
a.part('rim',rim.translate(0,10*k,2030*k).color(trim));
for(let i=0;i<8;i++){const t=i*Math.PI/4;a.part('net-'+i,box(10*k,230*k,340*k,true).rotateZ(i*8).translate(Math.cos(t)*170*k,-15*k,1850*k).color(body));}
return a.model();
