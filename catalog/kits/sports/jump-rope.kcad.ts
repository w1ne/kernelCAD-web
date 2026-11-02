meta({
  name: 'jump-rope',
  license: 'CC0-1.0',
  title: 'Jump rope',
  description: 'Flexible low-poly training loop with two oversized hand grips. Knobs: size, body and detail colours.',
  tags: ["jump rope", "skipping", "fitness", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 500,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#c8443c', { label: 'Body' });
const trim = param('trim', '#34383c', { label: 'Detail' });

presets({
  classic: { body: '#c8443c', trim: '#34383c' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('jump-rope');
for(let i=0;i<16;i++){
 const t=2*Math.PI*i/16,t2=2*Math.PI*(i+1)/16,x=Math.cos(t)*320*k,y=Math.sin(t)*190*k,x2=Math.cos(t2)*320*k,y2=Math.sin(t2)*190*k;
 const dx=x2-x,dy=y2-y,len=Math.hypot(dx,dy);
 a.part('rope-'+i,box(len,9*k,9*k,true).rotateZ(Math.atan2(dy,dx)*180/Math.PI).translate((x+x2)/2,(y+y2)/2,9*k).color(body));
}
for(const side of [-1,1])a.part('grip-'+side,box(48*k,165*k,44*k,true).rotateZ(side*18).translate(side*330*k,0,22*k).color(trim));
return a.model();
