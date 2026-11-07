// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "small-farm-wind-turbine",
  license: 'CC0-1.0',
  title: "Small farm wind turbine",
  description: "Small three-blade farm turbine with narrow tower, tail vane and square ground base. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b9bdab", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("small-farm-wind-turbine");
p.part("tower",c(0,0,0,1350,50,8).color(color));
p.part("nacelle",b(0,0,1350,340,140,130).color(color));
p.part("hub",c(0,-85,1390,80,75,8).color(color));
p.part("blade-up",b(0,-90,1470,60,55,520).color(color));
p.part("blade-left",b(-300,-90,1370,540,55,60).color(color));
p.part("blade-right",b(300,-90,1370,540,55,60).color(color));
p.part("tail",b(210,0,1330,240,35,160).color(color));
p.part("base",b(0,0,0,260,260,70).color(color));

return p.model();
