// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "membrane-filtration-rack",
  license: 'CC0-1.0',
  title: "Membrane filtration rack",
  description: "Skid-mounted membrane rack with four horizontal pressure tubes and end manifold rails. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6c7975", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("membrane-filtration-rack");
p.part("base-left",b(-470,0,0,90,700,50).color(color));
p.part("base-right",b(470,0,0,90,700,50).color(color));
p.part("membrane-0",c(0,-270,95,620,82,10).color(color));
p.part("membrane-1",c(0,-90,95,620,82,10).color(color));
p.part("membrane-2",c(0,90,95,620,82,10).color(color));
p.part("membrane-3",c(0,270,95,620,82,10).color(color));
p.part("manifold-left",b(-350,0,235,70,750,65).color(color));
p.part("manifold-right",b(350,0,235,70,750,65).color(color));
p.part("post--430",b(-430,0,50,55,60,370).color(color));
p.part("post-430",b(430,0,50,55,60,370).color(color));

return p.model();
