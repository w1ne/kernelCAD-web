// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "dewatering-screw-conveyor",
  license: 'CC0-1.0',
  title: "Sludge dewatering screw conveyor",
  description: "Inclined-look screw conveyor tube with feed hopper, discharge chute and support legs. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#636e68", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("dewatering-screw-conveyor");
p.part("base",b(0,0,0,1000,430,50).color(color));
p.part("trough",b(0,0,335,850,220,160).color(color));
p.part("hopper",b(-300,0,475,300,320,260).color(color));
p.part("discharge",b(380,0,475,230,210,200).color(color));
p.part("drive",c(-430,0,325,180,105,10).color(color));
p.part("leg--250",b(-250,0,50,65,75,250).color(color));
p.part("leg-260",b(260,0,50,65,75,250).color(color));
p.part("guard",b(0,0,505,650,180,55).color(color));

return p.model();
