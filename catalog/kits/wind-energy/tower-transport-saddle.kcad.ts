// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "tower-transport-saddle",
  license: 'CC0-1.0',
  title: "Tower section transport saddle",
  description: "Low transport cradle with V-shaped-looking supports, tie-down posts and skid rails. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#786f62", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("tower-transport-saddle");
p.part("rail-left",b(0,-260,0,1200,90,60).color(color));
p.part("rail-right",b(0,260,0,1200,90,60).color(color));
p.part("support-left",b(-220,0,130,100,520,260).color(color));
p.part("support-right",b(220,0,130,100,520,260).color(color));
p.part("tie--500",c(-500,0,0,240,30,8).color(color));
p.part("tie-500",c(500,0,0,240,30,8).color(color));

return p.model();
