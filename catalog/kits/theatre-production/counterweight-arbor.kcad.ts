// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "counterweight-arbor",
  license: 'CC0-1.0',
  title: "Counterweight arbor",
  description: "Stage counterweight frame with guide rails, compact weight stack, top crosshead and bottom stop. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6f7278", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("counterweight-arbor");
p.part("guide-left", b(-250,0,0,45,80,2100).color(color));
p.part("guide-right", b(250,0,0,45,80,2100).color(color));
p.part("crosshead", b(0,0,2040,700,100,100).color(color));
p.part("base-crossbar", b(0,0,0,650,100,90).color(color));
p.part("weight-one", b(0,0,170,400,120,220).color(color));
p.part("weight-two", b(0,0,390,400,120,220).color(color));
p.part("weight-three", b(0,0,610,400,120,220).color(color));
p.part("weight-four", b(0,0,830,400,120,220).color(color));
p.part("weight-five", b(0,0,1050,400,120,220).color(color));
p.part("tie-bar", b(0,0,1280,600,65,55).color(color));
p.part("sheave-left", c(-250,0,2110,150,75,10).color(color));
p.part("sheave-right", c(250,0,2110,150,75,10).color(color));

return p.model();
