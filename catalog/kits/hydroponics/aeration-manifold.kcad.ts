// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "aeration-manifold",
  license: 'CC0-1.0',
  title: "Aeration manifold",
  description: "Air distribution rail with four outlet risers, end fittings and mounting brackets. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#68847f", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("aeration-manifold");
p.part("mounting-rail", b(0,0,0,1600,180,60).color(color));
p.part("header", b(0,0,360,1650,75,75).color(color));
p.part("support-left", b(-720,0,60,60,60,300).color(color));
p.part("support-right", b(720,0,60,60,60,300).color(color));
p.part("branch-rail", b(0,0,120,1540,42,42).color(color));
p.part("riser-left", c(-550,0,120,310,28,10).color(color));
p.part("riser-mid-left", c(-180,0,120,310,28,10).color(color));
p.part("riser-mid-right", c(180,0,120,310,28,10).color(color));
p.part("riser-right", c(550,0,120,310,28,10).color(color));
p.part("end-cap-left", c(-825,0,340,75,55,10).color(color));
p.part("end-cap-right", c(825,0,340,75,55,10).color(color));

return p.model();
