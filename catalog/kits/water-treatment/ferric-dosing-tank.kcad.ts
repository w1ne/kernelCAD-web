// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ferric-dosing-tank",
  license: 'CC0-1.0',
  title: "Ferric coagulant day tank",
  description: "Small chemical day tank with bund base, level column, vent and dosing outlet. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8a765f", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("ferric-dosing-tank");
p.part("bund",b(0,0,0,650,520,50).color(color));
p.part("tank",c(0,0,50,560,210,12).color(color));
p.part("lid",c(0,0,610,55,220,12).color(color));
p.part("vent",c(0,0,665,180,32,10).color(color));
p.part("level-column",b(170,-220,125,45,35,360).color(color));
p.part("outlet",c(-190,0,25,130,40,10).color(color));

return p.model();
