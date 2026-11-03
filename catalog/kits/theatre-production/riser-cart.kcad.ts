// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "riser-cart",
  license: 'CC0-1.0',
  title: "Riser cart",
  description: "Rolling cart with stacked folding platform sections, end guards and a tall pull handle. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#71747c", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("riser-cart");
p.part("lower-platform", b(0,0,180,1050,650,70).color(color));
p.part("middle-platform", b(0,0,270,1050,650,70).color(color));
p.part("upper-platform", b(0,0,360,1050,650,70).color(color));
p.part("front-stop", b(0,-310,430,1000,45,120).color(color));
p.part("back-stop", b(0,310,430,1000,45,120).color(color));
p.part("handle-left", b(-450,250,130,55,55,1000).color(color));
p.part("handle-right", b(450,250,130,55,55,1000).color(color));
p.part("handle-top", b(0,250,1130,930,55,55).color(color));
p.part("side-rail-left", b(-500,0,220,45,600,70).color(color));
p.part("side-rail-right", b(500,0,220,45,600,70).color(color));
p.part("wheel-a", c(-440,-260,0,170,58,10).color(color));
p.part("wheel-b", c(440,-260,0,170,58,10).color(color));
p.part("wheel-c", c(-440,260,0,170,58,10).color(color));
p.part("wheel-d", c(440,260,0,170,58,10).color(color));

return p.model();
