// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "intake-gate-hoist",
  license: 'CC0-1.0',
  title: "Intake gate hoist frame",
  description: "Compact lifting frame with paired uprights, crossbeam, drum and hanging gate chain. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#555f60", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("intake-gate-hoist");
p.part("base-left",b(-430,0,0,150,420,60).color(color));
p.part("base-right",b(430,0,0,150,420,60).color(color));
p.part("upright-left",b(-430,0,30,65,75,950).color(color));
p.part("upright-right",b(430,0,30,65,75,950).color(color));
p.part("beam",b(0,0,900,930,100,90).color(color));
p.part("drum",c(0,0,790,100,105,10).color(color));
p.part("chain",b(0,0,550,24,24,240).color(color));
p.part("gate-plate",b(0,0,50,680,90,450).color(color));

return p.model();
