// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "turbine-blade-root-sleeve",
  license: 'CC0-1.0',
  title: "Blade root sleeve",
  description: "Short blade-root sleeve with a broad flange, inner collar and four attachment lugs. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8d9189", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("turbine-blade-root-sleeve");
p.part("flange",c(0,0,0,70,310,12).color(color));
p.part("sleeve",c(0,0,70,430,190,10).color(color));
p.part("lug-0",b(230,0,20,80,100,80).color(color));
p.part("lug-1",b(-230,0,20,80,100,80).color(color));
p.part("lug-2",b(0,230,20,80,100,80).color(color));
p.part("lug-3",b(0,-230,20,80,100,80).color(color));

return p.model();
