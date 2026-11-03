// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "horizontal-axis-wind-turbine",
  license: 'CC0-1.0',
  title: "Horizontal-axis wind turbine",
  description: "Onshore turbine silhouette with tower, box nacelle, hub, three broad blades and foundation. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d8d8d1", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("horizontal-axis-wind-turbine");
p.part("tower",c(0,0,0,2500,85,8).color(color));
p.part("nacelle",b(0,0,2500,620,180,200).color(color));
p.part("hub",c(0,-110,2570,160,140,8).color(color));
p.part("blade-up",b(0,-120,2750,110,70,900).color(color));
p.part("blade-left",b(-530,-120,2520,930,70,110).color(color));
p.part("blade-right",b(530,-120,2520,930,70,110).color(color));
p.part("base-flange",c(0,0,0,90,160,8).color(color));

return p.model();
