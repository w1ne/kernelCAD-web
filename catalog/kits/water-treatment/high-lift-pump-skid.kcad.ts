// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "high-lift-pump-skid",
  license: 'CC0-1.0',
  title: "High lift pump skid",
  description: "Large pump skid with motor housing, volute body, discharge elbow and a broad foundation rail. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#64716e", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("high-lift-pump-skid");
p.part("base",b(0,0,0,1100,700,50).color(color));
p.part("motor",b(-230,0,245,420,360,340).color(color));
p.part("motor-cap",c(-440,0,355,130,180,10).color(color));
p.part("pump-body",c(180,0,85,280,180,10).color(color));
p.part("discharge",b(180,0,365,110,110,300).color(color));
p.part("suction",c(320,0,55,280,80,10).color(color));
p.part("coupling-guard",b(0,0,95,180,150,100).color(color));

return p.model();
