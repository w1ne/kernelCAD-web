// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "in-row-cooler",
  license: 'CC0-1.0',
  title: "In-row precision cooler",
  description: "Row cooling cabinet with front intake grille, top return, and pipe stubs. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#69777d", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("in-row-cooler");
p.part("base-plinth", b(0, 0, 0, 900, 900, 90).color(color));
p.part("cooler-cabinet", b(0, 0, 90, 820, 820, 1900).color(color));
p.part("intake-louver-0", b(0, -430, 220, 610, 26, 54).color(color));
p.part("intake-louver-1", b(0, -430, 345, 610, 26, 54).color(color));
p.part("intake-louver-2", b(0, -430, 470, 610, 26, 54).color(color));
p.part("intake-louver-3", b(0, -430, 595, 610, 26, 54).color(color));
p.part("intake-louver-4", b(0, -430, 720, 610, 26, 54).color(color));
p.part("intake-louver-5", b(0, -430, 845, 610, 26, 54).color(color));
p.part("intake-louver-6", b(0, -430, 970, 610, 26, 54).color(color));
p.part("intake-louver-7", b(0, -430, 1095, 610, 26, 54).color(color));
p.part("intake-louver-8", b(0, -430, 1220, 610, 26, 54).color(color));
p.part("intake-louver-9", b(0, -430, 1345, 610, 26, 54).color(color));
p.part("top-fan-left", c(-220, 160, 1990, 75, 165, 12).color(color));
p.part("top-fan-right", c(220, 160, 1990, 75, 165, 12).color(color));
p.part("pipe-stub-supply", hy(0, 470, 460, 130, 72, 10).color(color));
p.part("pipe-stub-return", hy(0, 470, 680, 130, 72, 10).color(color));

return p.model();
