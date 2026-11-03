// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "surface-aerator",
  license: 'CC0-1.0',
  title: "Surface aerator assembly",
  description: "Floating bridge aerator with twin pontoons, motor housing and a low polygon rotor guard. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#657d7a", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("surface-aerator");
p.part("pontoon-left",b(-300,0,10,520,180,80).color(color));
p.part("pontoon-right",b(300,0,10,520,180,80).color(color));
p.part("bridge",b(0,0,95,800,110,60).color(color));
p.part("motor",b(0,0,180,260,220,170).color(color));
p.part("shaft",c(0,0,40,160,45,10).color(color));
p.part("guard",b(0,0,0,420,420,35).color(color));
p.part("guard-post--180--180",b(-180,-180,35,28,28,180).color(color));
p.part("guard-post--180-180",b(-180,180,35,28,28,180).color(color));
p.part("guard-post-180--180",b(180,-180,35,28,28,180).color(color));
p.part("guard-post-180-180",b(180,180,35,28,28,180).color(color));

return p.model();
