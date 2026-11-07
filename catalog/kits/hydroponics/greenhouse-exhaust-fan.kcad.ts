// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "greenhouse-exhaust-fan",
  license: 'CC0-1.0',
  title: "Greenhouse exhaust fan",
  description: "Square wall exhaust fan module with a central hub, four block-style blades and mounting frame. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#708279", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("greenhouse-exhaust-fan");
p.part("outer-frame", b(0,0,0,1050,250,1050).color(color));
p.part("inner-frame", b(0,-140,90,850,35,850).color(color));
p.part("blade-left", b(-210,-80,525,380,50,105).color(color));
p.part("blade-right", b(210,-80,525,380,50,105).color(color));
p.part("blade-upper", b(0,-80,735,50,380,105).color(color));
p.part("blade-lower", b(0,-80,315,50,380,105).color(color));
p.part("motor-bracket", b(0,80,450,500,180,90).color(color));
p.part("fan-hub", c(0,-110,470,180,130,10).color(color));
p.part("corner-boss-left", c(-470,-145,0,90,48,10).color(color));
p.part("corner-boss-right", c(470,-145,0,90,48,10).color(color));

return p.model();
