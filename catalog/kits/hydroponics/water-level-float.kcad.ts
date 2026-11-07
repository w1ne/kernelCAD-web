// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "water-level-float",
  license: 'CC0-1.0',
  title: "Water level float",
  description: "Float switch assembly with guide mast, adjustable collar and protected cable lead. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#79877b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("water-level-float");
p.part("mounting-foot", b(0,0,0,360,340,55).color(color));
p.part("top-bracket", b(0,0,760,310,270,55).color(color));
p.part("clamp-block", b(0,0,650,180,150,120).color(color));
p.part("cable-clip", b(0,-145,710,100,35,45).color(color));
p.part("guide-mast", c(0,0,55,820,34,10).color(color));
p.part("float-body", c(0,0,170,155,92,10).color(color));
p.part("adjust-collar", c(0,0,520,60,50,10).color(color));
p.part("cable-gland", c(0,-120,725,100,30,10).color(color));
p.part("switch-head", c(0,0,820,115,78,10).color(color));

return p.model();
