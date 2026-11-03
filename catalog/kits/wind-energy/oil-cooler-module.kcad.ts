// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "oil-cooler-module",
  license: 'CC0-1.0',
  title: "Cooling module",
  description: "Cooling module with radiator core, two side fans and upper pipe headers. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#707976", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("oil-cooler-module");
p.part("core",b(0,0,250,700,300,500).color(color));
p.part("fan-0",c(-190,-175,280,120,115,8).color(color));
p.part("fan-1",c(190,-175,280,120,115,8).color(color));
p.part("header-top",b(0,0,540,760,350,70).color(color));
p.part("header-bottom",b(0,0,80,760,350,70).color(color));
p.part("foot--260",b(-260,0,0,120,160,70).color(color));
p.part("foot-260",b(260,0,0,120,160,70).color(color));

return p.model();
