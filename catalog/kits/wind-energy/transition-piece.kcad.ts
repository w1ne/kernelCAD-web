// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "transition-piece",
  license: 'CC0-1.0',
  title: "Offshore transition piece",
  description: "Offshore tower transition collar with a broad flange, inspection door and two boat-landing rails. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#797f7c", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("transition-piece");
p.part("lower-flange",c(0,0,0,90,360,12).color(color));
p.part("body",c(0,0,90,1000,235,12).color(color));
p.part("top-flange",c(0,0,1090,90,280,12).color(color));
p.part("door",b(0,-238,400,260,20,500).color(color));
p.part("boat-rail-left",b(-210,-310,160,50,55,760).color(color));
p.part("boat-rail-right",b(210,-310,160,50,55,760).color(color));

return p.model();
