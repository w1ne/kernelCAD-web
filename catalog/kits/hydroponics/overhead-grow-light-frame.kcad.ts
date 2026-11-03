// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "overhead-grow-light-frame",
  license: 'CC0-1.0',
  title: "Overhead grow light frame",
  description: "Raised horticultural lighting gantry with paired rails, cross beams and hanging light bars. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#71867b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("overhead-grow-light-frame");
p.part("foot-left-front", b(-900,-650,0,100,100,90).color(color));
p.part("foot-right-front", b(900,-650,0,100,100,90).color(color));
p.part("foot-left-back", b(-900,650,0,100,100,90).color(color));
p.part("foot-right-back", b(900,650,0,100,100,90).color(color));
p.part("leg-left-front", b(-900,-650,90,60,60,2400).color(color));
p.part("leg-right-front", b(900,-650,90,60,60,2400).color(color));
p.part("leg-left-back", b(-900,650,90,60,60,2400).color(color));
p.part("leg-right-back", b(900,650,90,60,60,2400).color(color));
p.part("top-beam-front", b(0,-650,2490,1850,60,60).color(color));
p.part("top-beam-back", b(0,650,2490,1850,60,60).color(color));
p.part("light-bar-a", b(0,-330,2330,1650,100,55).color(color));
p.part("light-bar-b", b(0,330,2330,1650,100,55).color(color));
p.part("hanger-left", c(-620,0,2220,120,18,10).color(color));
p.part("hanger-right", c(620,0,2220,120,18,10).color(color));

return p.model();
