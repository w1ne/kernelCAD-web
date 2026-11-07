// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "knife-gate-valve-assembly",
  license: 'CC0-1.0',
  title: "Knife gate valve assembly",
  description: "Process valve with square gate body, rising stem, handwheel and paired pipe flanges. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6d7772", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("knife-gate-valve-assembly");
p.part("gate-body",b(0,0,65,300,300,240).color(color));
p.part("pipe-left",c(0,-220,135,130,100,10).color(color));
p.part("pipe-right",c(0,220,135,130,100,10).color(color));
p.part("bonnet",b(0,0,305,180,180,70).color(color));
p.part("stem",c(0,0,375,280,28,10).color(color));
p.part("handwheel",c(0,0,655,30,105,12).color(color));
p.part("mount-foot",b(0,0,0,380,380,45).color(color));

return p.model();
