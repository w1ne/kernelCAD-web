// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "seedling-transplant-tool",
  license: 'CC0-1.0',
  title: "Seedling transplant tool",
  description: "Hand tool with a tapered dibber body, broad grip and protective collar. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7d8475", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("seedling-transplant-tool");
p.part("grip", b(0,0,580,360,120,120).color(color));
p.part("grip-end-left", b(-180,0,590,35,135,140).color(color));
p.part("grip-end-right", b(180,0,590,35,135,140).color(color));
p.part("shaft", b(0,0,130,65,65,450).color(color));
p.part("guard", b(0,0,115,180,180,45).color(color));
p.part("tip", b(0,0,0,80,80,135).color(color));
p.part("collar", c(0,0,525,55,52,10).color(color));
p.part("hanging-eye", c(0,0,700,70,34,10).color(color));

return p.model();
