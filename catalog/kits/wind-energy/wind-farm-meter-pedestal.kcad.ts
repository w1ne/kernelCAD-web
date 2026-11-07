// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "wind-farm-meter-pedestal",
  license: 'CC0-1.0',
  title: "Wind farm meter pedestal",
  description: "Short metering pedestal with a cabinet head, status light and broad footplate. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#75817b", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("wind-farm-meter-pedestal");
p.part("foot",b(0,0,0,360,360,50).color(color));
p.part("post",c(0,0,25,720,50,8).color(color));
p.part("head",b(0,0,745,380,300,300).color(color));
p.part("screen",b(0,-155,775,200,18,135).color(color));
p.part("light",c(120,-170,695,32,22,8).color(color));
p.part("hood",b(0,0,915,420,340,40).color(color));

return p.model();
