// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ebb-flow-grow-table",
  license: 'CC0-1.0',
  title: "Ebb-and-flow grow table",
  description: "Flood-and-drain bench with a shallow growing tray, underframe, overflow standpipe and return outlet. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#708579", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("ebb-flow-grow-table");
p.part("tray-floor", b(0,0,780,1800,1050,80).color(color));
p.part("front-lip", b(0,-520,860,1800,55,110).color(color));
p.part("back-lip", b(0,520,860,1800,55,110).color(color));
p.part("left-lip", b(-872,0,860,55,1000,110).color(color));
p.part("right-lip", b(872,0,860,55,1000,110).color(color));
p.part("leg-left-front", b(-780,-430,0,55,55,780).color(color));
p.part("leg-right-front", b(780,-430,0,55,55,780).color(color));
p.part("leg-left-back", b(-780,430,0,55,55,780).color(color));
p.part("leg-right-back", b(780,430,0,55,55,780).color(color));
p.part("lower-brace", b(0,0,280,1550,55,50).color(color));
p.part("overflow-standpipe", c(600,300,610,170,25,10).color(color));
p.part("return-outlet", c(-700,-500,600,180,32,10).color(color));

return p.model();
