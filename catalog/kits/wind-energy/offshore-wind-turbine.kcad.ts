// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "offshore-wind-turbine",
  license: 'CC0-1.0',
  title: "Offshore wind turbine",
  description: "Offshore turbine scene prop with monopile, transition collar, tower, nacelle and rotor. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#c9d1d0", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("offshore-wind-turbine");
p.part("monopile",c(0,0,0,1200,180,8).color(color));
p.part("transition",c(0,0,1150,450,220,8).color(color));
p.part("tower",c(0,0,1500,1900,100,8).color(color));
p.part("nacelle",b(0,0,3400,650,220,220).color(color));
p.part("hub",c(0,-140,3470,160,145,8).color(color));
p.part("blade-up",b(0,-150,3630,100,70,1050).color(color));
p.part("blade-left",b(-600,-150,3420,1050,70,100).color(color));
p.part("blade-right",b(600,-150,3420,1050,70,100).color(color));

return p.model();
