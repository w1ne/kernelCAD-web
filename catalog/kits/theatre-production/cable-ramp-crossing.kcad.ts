// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "cable-ramp-crossing",
  license: 'CC0-1.0',
  title: "Cable ramp crossing",
  description: "Low stage-floor cable cover with a central raceway, sloped shoulders and two end guards. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#696f78", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("cable-ramp-crossing");
p.part("base", b(0,0,0,1200,360,55).color(color));
p.part("center-raceway", b(0,0,55,1200,170,95).color(color));
p.part("left-shoulder", b(-480,0,55,240,360,70).color(color));
p.part("right-shoulder", b(480,0,55,240,360,70).color(color));
p.part("top-cover", b(0,0,150,1200,160,45).color(color));
p.part("end-guard-left", b(-580,0,0,40,380,155).color(color));
p.part("end-guard-right", b(580,0,0,40,380,155).color(color));
p.part("hinge-strip", b(0,-95,155,1200,35,30).color(color));
p.part("anchor-left", c(-500,0,0,75,30,10).color(color));
p.part("anchor-right", c(500,0,0,75,30,10).color(color));

return p.model();
