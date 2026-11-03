// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "turbine-number-placard",
  license: 'CC0-1.0',
  title: "Turbine number placard",
  description: "Small numbered turbine ID plate on a short post with a broad mounting foot. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#c3c6be", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("turbine-number-placard");
p.part("plate",b(0,0,620,420,35,240).color(color));
p.part("post",c(0,0,50,550,34,8).color(color));
p.part("foot",b(0,0,0,200,200,50).color(color));
p.part("border",b(0,-20,620,360,12,190).color(color));

return p.model();
