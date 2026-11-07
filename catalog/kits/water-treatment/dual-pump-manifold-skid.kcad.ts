// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "dual-pump-manifold-skid",
  license: 'CC0-1.0',
  title: "Dual pump manifold skid",
  description: "Two pump bodies joined by a common suction header, discharge header and service frame. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#687773", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("dual-pump-manifold-skid");
p.part("base",b(0,0,0,1200,640,50).color(color));
p.part("pump-0",c(-340,0,55,240,115,10).color(color));
p.part("pump-1",c(340,0,55,240,115,10).color(color));
p.part("suction-header",c(0,-240,145,760,40,10).color(color));
p.part("discharge-header",c(0,240,275,760,40,10).color(color));
p.part("branch-0",b(-340,0,135,55,220,150).color(color));
p.part("branch-1",b(340,0,135,55,220,150).color(color));
p.part("frame-post--500",b(-500,0,50,45,55,320).color(color));
p.part("frame-post-500",b(500,0,50,45,55,320).color(color));
p.part("top-frame",b(0,0,370,1050,45,45).color(color));

return p.model();
