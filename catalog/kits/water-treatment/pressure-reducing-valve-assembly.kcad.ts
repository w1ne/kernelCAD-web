// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "pressure-reducing-valve-assembly",
  license: 'CC0-1.0',
  title: "Pressure reducing valve assembly",
  description: "Valve body with wide flanges, bonnet, actuator column and manual handwheel. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#73796f", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("pressure-reducing-valve-assembly");
p.part("body",c(0,0,40,260,150,12).color(color));
p.part("flange-left",c(0,0,0,40,190,12).color(color));
p.part("flange-right",c(0,0,300,40,190,12).color(color));
p.part("bonnet",c(0,0,300,150,78,10).color(color));
p.part("actuator",b(0,0,450,170,170,150).color(color));
p.part("stem",c(0,0,600,100,32,10).color(color));
p.part("handwheel",c(0,0,700,35,110,12).color(color));

return p.model();
