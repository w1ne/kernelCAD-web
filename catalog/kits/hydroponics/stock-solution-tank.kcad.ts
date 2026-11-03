// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "stock-solution-tank",
  license: 'CC0-1.0',
  title: "Stock solution tank",
  description: "Compact concentrate vessel with a broad cap, metering port and raised base ring. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7a8572", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("stock-solution-tank");
p.part("tank", b(0,0,0,720,720,900).color(color));
p.part("base-ring", b(0,0,0,770,770,85).color(color));
p.part("top-cap", b(0,0,900,760,760,75).color(color));
p.part("cap-grip", b(0,0,975,220,150,55).color(color));
p.part("front-label-panel", b(0,-365,500,390,24,250).color(color));
p.part("side-rib-left", b(-335,0,110,34,650,680).color(color));
p.part("side-rib-right", b(335,0,110,34,650,680).color(color));
p.part("metering-valve", c(270,-390,120,150,32,10).color(color));
p.part("dip-tube", c(270,-390,270,490,16,10).color(color));

return p.model();
