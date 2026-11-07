// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "equalization-basin",
  license: 'CC0-1.0',
  title: "Equalization basin",
  description: "Low open equalization basin with thick perimeter walls and a central mixer column. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#667a78", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("equalization-basin");
p.part("floor",b(0,0,0,1400,1100,40).color(color));
p.part("wall-front",b(0,-520,20,1400,60,480).color(color));
p.part("wall-back",b(0,520,20,1400,60,480).color(color));
p.part("wall-left",b(-670,0,20,60,1000,480).color(color));
p.part("wall-right",b(670,0,20,60,1000,480).color(color));
p.part("mixer-pedestal",c(0,0,40,460,120,10).color(color));
p.part("mixer-arm",b(0,0,480,800,70,60).color(color));
p.part("mixer-hub",c(0,0,410,140,95,10).color(color));

return p.model();
