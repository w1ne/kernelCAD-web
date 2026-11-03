// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "aviation-light",
  license: 'CC0-1.0',
  title: "Turbine aviation light",
  description: "Low polygon aviation beacon with a square bracket, cylindrical lamp and cap. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b34d42", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("aviation-light");
p.part("mount",b(0,0,0,200,200,40).color(color));
p.part("stem",c(0,0,20,100,28,8).color(color));
p.part("lamp",c(0,0,120,100,75,8).color(color));
p.part("cap",c(0,0,220,30,82,8).color(color));

return p.model();
