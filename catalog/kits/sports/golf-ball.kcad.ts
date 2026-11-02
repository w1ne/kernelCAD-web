meta({
  name: 'golf-ball',
  license: 'CC0-1.0',
  title: 'Golf ball',
  description: 'Small white golf ball with low-poly surface dimples. Knobs: size, body and detail colours.',
  tags: ["golf", "ball", "course", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 600,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#f3f1e8', { label: 'Body' });
const trim = param('trim', '#c8cbd0', { label: 'Detail' });

presets({
  classic: { body: '#f3f1e8', trim: '#c8cbd0' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('golf-ball');
const R = 43 * k;
a.part('shell', sphere(R).scale([1, 1, 1]).translate(0,0,R*1).color(body));

for(let i=0;i<6;i++){
 const t=i*Math.PI/3,x=Math.cos(t)*R*.55,z=R+Math.sin(t)*R*.55;
 const y=-Math.sqrt(Math.max(0,R*R-x*x-(z-R)*(z-R)))+1*k;
 a.part('dimple-'+i,cylinder(2*k,4.5*k).rotateX(90).translate(x,y,z).color(trim));
}
return a.model();
