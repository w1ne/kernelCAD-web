// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "process-pipe-rack",
  license: 'CC0-1.0',
  title: "Treatment process pipe rack",
  description: "Low pipe rack with four parallel process lines, portal supports and end cross braces. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#616c69", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("process-pipe-rack");
p.part("pipe-0",c(0,-300,215,1300,34,10).color(color));
p.part("pipe-1",c(0,-100,215,1300,34,10).color(color));
p.part("pipe-2",c(0,100,215,1300,34,10).color(color));
p.part("pipe-3",c(0,300,215,1300,34,10).color(color));
p.part("portal-leg--520",b(-520,0,0,55,640,420).color(color));
p.part("portal-leg-520",b(520,0,0,55,640,420).color(color));
p.part("portal-top-a",b(-520,0,395,75,650,55).color(color));
p.part("portal-top-b",b(520,0,395,75,650,55).color(color));
p.part("cross-brace",b(0,0,415,1080,45,45).color(color));

return p.model();
