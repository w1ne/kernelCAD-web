meta({
  name: 'soccer-ball',
  license: 'CC0-1.0',
  title: 'Soccer ball',
  description: 'Round football with six raised dark polygon panels on its faceted shell. Knobs: size, body and detail colours.',
  tags: ["soccer", "football", "ball", "pitch", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 500,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#f1f0e8', { label: 'Body' });
const trim = param('trim', '#26282b', { label: 'Detail' });

presets({
  classic: { body: '#f1f0e8', trim: '#26282b' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('soccer-ball');
const R = 108 * k;
a.part('shell', sphere(R).scale([1, 1, 1]).translate(0,0,R*1).color(body));

const hex=q=>path().moveTo(q,0).lineTo(q/2,q*.866).lineTo(-q/2,q*.866).lineTo(-q,0).lineTo(-q/2,-q*.866).lineTo(q/2,-q*.866).close();
let panel=0;
for(const [x,dz] of [[0,0],[-30,-28],[30,-28],[-30,28],[30,28],[0,52]]){
 const y=-Math.sqrt(Math.max(0,R*R-x*x-dz*dz))-1;
 a.part('panel-'+panel++,hex(18*k).extrude(3*k).rotateX(90).translate(x*k,y,R+dz*k).color(trim));
}
return a.model();
