// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "coagulant-mixing-tank",
  license: 'CC0-1.0',
  title: "Coagulant mixing tank",
  description: "Cylindrical mixing tank with a compact gearbox, crossbar and twin impeller blades. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7d8278", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("coagulant-mixing-tank");
p.part("tank",c(0,0,0,640,330,12).color(color));
p.part("rim",c(0,0,620,60,355,12).color(color));
p.part("shaft",c(0,0,680,430,34,10).color(color));
p.part("gearbox",b(0,0,1110,220,190,150).color(color));
p.part("impeller-left",b(-150,0,820,300,45,40).color(color));
p.part("impeller-right",b(150,0,820,300,45,40).color(color));
p.part("inlet",c(0,-350,410,100,44,10).color(color));

return p.model();
