// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "pressure-transmitter-stand",
  license: 'CC0-1.0',
  title: "Pressure transmitter stand",
  description: "Instrument stand with pressure manifold, paired transmitter blocks and a protective top rail. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#727a74", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("pressure-transmitter-stand");
p.part("base",b(0,0,0,420,340,50).color(color));
p.part("post",b(0,0,50,65,65,620).color(color));
p.part("crossbar",b(0,0,670,430,50,45).color(color));
p.part("manifold",c(0,0,195,240,65,10).color(color));
p.part("transmitter-0",b(-120,-75,305,100,90,170).color(color));
p.part("transmitter-1",b(120,-75,305,100,90,170).color(color));
p.part("tap-0",c(-150,0,135,90,30,10).color(color));
p.part("tap-1",c(150,0,135,90,30,10).color(color));

return p.model();
