// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "turbidity-analyzer-panel",
  license: 'CC0-1.0',
  title: "Turbidity analyzer panel",
  description: "Wall-mount analyzer panel with display hood, sample cell housing and two service ports. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d2d1c4", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("turbidity-analyzer-panel");
p.part("panel",b(0,0,320,460,160,850).color(color));
p.part("hood",b(0,0,760,500,220,55).color(color));
p.part("display",b(0,-88,620,220,18,130).color(color));
p.part("sample-cell",b(0,0,70,270,180,250).color(color));
p.part("port-left",c(-160,-110,0,100,33,10).color(color));
p.part("port-right",c(160,-110,0,100,33,10).color(color));
p.part("label-strip",b(0,-96,400,180,20,55).color(color));

return p.model();
