// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "screen-filter-housing",
  license: 'CC0-1.0',
  title: "Screen filter housing",
  description: "Inline filter body with clamp collars, removable cap, inlet and outlet unions. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#667f78", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("screen-filter-housing");
p.part("mounting-skid", b(0,0,0,900,380,60).color(color));
p.part("left-union", b(-520,0,270,300,100,100).color(color));
p.part("right-union", b(520,0,270,300,100,100).color(color));
p.part("front-label", b(0,-315,320,280,25,150).color(color));
p.part("cap-tab", b(0,0,830,120,120,70).color(color));
p.part("support-left", b(-300,0,60,55,55,240).color(color));
p.part("support-right", b(300,0,60,55,55,240).color(color));
p.part("filter-canister", c(0,0,220,600,180,10).color(color));
p.part("top-cap", c(0,0,820,95,205,10).color(color));
p.part("inlet-port", c(-500,0,280,190,48,10).color(color));
p.part("outlet-port", c(500,0,280,190,48,10).color(color));

return p.model();
