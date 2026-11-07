// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "net-pot-stack",
  license: 'CC0-1.0',
  title: "Net pot stack",
  description: "Nested-looking stack of four lightweight planting cups with rolled rims and tapered-looking steps. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#758277", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("net-pot-stack");
p.part("base-plate", b(0,0,0,420,420,35).color(color));
p.part("lower-cup", b(0,0,35,300,300,150).color(color));
p.part("second-cup", b(0,0,180,270,270,150).color(color));
p.part("third-cup", b(0,0,325,240,240,150).color(color));
p.part("upper-cup", b(0,0,470,210,210,150).color(color));
p.part("rim-lower", b(0,0,185,350,350,32).color(color));
p.part("rim-middle", b(0,0,330,320,320,32).color(color));
p.part("rim-upper", b(0,0,475,290,290,32).color(color));
p.part("center-spacer", c(0,0,35,575,30,10).color(color));

return p.model();
