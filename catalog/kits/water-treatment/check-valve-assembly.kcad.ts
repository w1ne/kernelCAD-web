// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "check-valve-assembly",
  license: 'CC0-1.0',
  title: "Check valve assembly",
  description: "Compact check valve body with hinged cover, raised inspection bonnet and flange ends. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#717970", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("check-valve-assembly");
p.part("body",c(0,0,40,240,140,12).color(color));
p.part("flange-left",c(0,0,0,38,180,12).color(color));
p.part("flange-right",c(0,0,282,38,180,12).color(color));
p.part("cover",b(0,0,290,180,170,40).color(color));
p.part("hinge",c(0,0,330,45,50,10).color(color));
p.part("inspection-bolt",b(0,0,375,80,80,40).color(color));

return p.model();
