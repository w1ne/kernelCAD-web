// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "dance-floor-panel",
  license: 'CC0-1.0',
  title: "Dance floor panel",
  description: "Portable sprung-floor section with surface boards, perimeter fascia and underfloor blocks. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#776c5d", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("dance-floor-panel");
p.part("floor-surface", b(0,0,150,1800,1200,55).color(color));
p.part("front-fascia", b(0,-590,75,1800,45,100).color(color));
p.part("back-fascia", b(0,590,75,1800,45,100).color(color));
p.part("left-fascia", b(-880,0,75,45,1140,100).color(color));
p.part("right-fascia", b(880,0,75,45,1140,100).color(color));
p.part("under-rail-front", b(0,-430,45,1680,60,55).color(color));
p.part("under-rail-back", b(0,430,45,1680,60,55).color(color));
p.part("under-rail-left", b(-700,0,45,55,820,55).color(color));
p.part("under-rail-right", b(700,0,45,55,820,55).color(color));
p.part("isolation-pad-a", c(-700,-430,0,50,70,10).color(color));
p.part("isolation-pad-b", c(700,-430,0,50,70,10).color(color));
p.part("isolation-pad-c", c(-700,430,0,50,70,10).color(color));
p.part("isolation-pad-d", c(700,430,0,50,70,10).color(color));

return p.model();
