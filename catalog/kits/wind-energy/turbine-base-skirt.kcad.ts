// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "turbine-base-skirt",
  license: 'CC0-1.0',
  title: "Tower base skirt",
  description: "Low polygon tower base fairing with a circular foot, raised skirt and access cutout panel. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#858a88", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("turbine-base-skirt");
p.part("foot",c(0,0,0,60,330,8).color(color));
p.part("skirt",c(0,0,60,420,250,8).color(color));
p.part("access-panel",b(0,-258,180,220,18,260).color(color));
p.part("rim",c(0,0,480,35,270,8).color(color));

return p.model();
