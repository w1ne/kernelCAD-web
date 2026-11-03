// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "rolling-stage-platform",
  license: 'CC0-1.0',
  title: "Rolling stage platform",
  description: "Mobile platform with a raised work deck, guard sockets and four compact caster blocks. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#707681", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("rolling-stage-platform");
p.part("platform-deck", b(0,0,440,1400,980,95).color(color));
p.part("front-apron", b(0,-480,220,1400,55,240).color(color));
p.part("rear-apron", b(0,480,220,1400,55,240).color(color));
p.part("underframe-left", b(-620,0,180,55,880,60).color(color));
p.part("underframe-right", b(620,0,180,55,880,60).color(color));
p.part("socket-left", b(-550,0,535,90,90,100).color(color));
p.part("socket-right", b(550,0,535,90,90,100).color(color));
p.part("caster-left-front", c(-600,-410,0,180,58,10).color(color));
p.part("caster-right-front", c(600,-410,0,180,58,10).color(color));
p.part("caster-left-back", c(-600,410,0,180,58,10).color(color));
p.part("caster-right-back", c(600,410,0,180,58,10).color(color));

return p.model();
