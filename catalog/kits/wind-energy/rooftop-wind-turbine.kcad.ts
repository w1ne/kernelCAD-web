// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "rooftop-wind-turbine",
  license: 'CC0-1.0',
  title: "Rooftop wind turbine",
  description: "Compact roof turbine on a tripod mast with short nacelle and three stub blades. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7e8a88", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("rooftop-wind-turbine");
p.part("roof-plate",b(0,0,0,520,520,50).color(color));
p.part("mast",c(0,0,50,760,40,8).color(color));
p.part("nacelle",b(0,0,810,380,150,150).color(color));
p.part("hub",c(0,-90,850,90,95,8).color(color));
p.part("blade-up",b(0,-90,940,70,65,400).color(color));
p.part("blade-left",b(-235,-90,835,400,65,70).color(color));
p.part("blade-right",b(235,-90,835,400,65,70).color(color));
p.part("leg--180--180",b(-180,-180,35,45,45,370).color(color));
p.part("leg-180--180",b(180,-180,35,45,45,370).color(color));
p.part("leg-0-180",b(0,180,35,45,45,370).color(color));

return p.model();
