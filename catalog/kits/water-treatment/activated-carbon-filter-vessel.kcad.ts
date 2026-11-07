// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "activated-carbon-filter-vessel",
  license: 'CC0-1.0',
  title: "Activated carbon filter vessel",
  description: "Tall carbon filter vessel with top hatch, lower skirt, side ports and three support legs. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5f7071", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("activated-carbon-filter-vessel");
p.part("vessel",c(0,0,80,1000,280,12).color(color));
p.part("top-dome",c(0,0,1080,100,250,12).color(color));
p.part("bottom-dome",c(0,0,0,80,250,12).color(color));
p.part("hatch",c(0,0,1180,65,95,10).color(color));
p.part("port-upper",c(0,-340,780,90,52,10).color(color));
p.part("port-lower",c(0,-340,300,90,52,10).color(color));
p.part("leg--170",b(-170,0,0,75,90,190).color(color));
p.part("leg-0",b(0,0,0,75,90,190).color(color));
p.part("leg-170",b(170,0,0,75,90,190).color(color));

return p.model();
