// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ph-probe-flow-cell",
  license: 'CC0-1.0',
  title: "pH probe flow cell",
  description: "Sampling cell with two hose unions, a probe gland and a compact mounting block. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#698780", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("ph-probe-flow-cell");
p.part("mounting-block", b(0,0,0,480,300,70).color(color));
p.part("front-label", b(0,-165,260,220,22,120).color(color));
p.part("left-union", b(-300,0,230,220,80,80).color(color));
p.part("right-union", b(300,0,230,220,80,80).color(color));
p.part("probe-clip", b(0,0,590,150,100,65).color(color));
p.part("flow-cell", c(0,0,90,440,140,10).color(color));
p.part("probe-gland", c(0,0,520,115,63,10).color(color));
p.part("probe-stem", c(0,0,625,340,25,10).color(color));
p.part("inlet", c(-320,0,250,150,45,10).color(color));
p.part("outlet", c(320,0,250,150,45,10).color(color));

return p.model();
