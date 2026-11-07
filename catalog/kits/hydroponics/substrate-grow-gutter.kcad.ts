// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "substrate-grow-gutter",
  license: 'CC0-1.0',
  title: "Substrate grow gutter",
  description: "Long raised crop gutter with end caps, support saddles, drain pickup and parallel feed tube. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#758878", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("substrate-grow-gutter");
p.part("trough", b(0,0,500,2100,340,170).color(color));
p.part("front-rim", b(0,-185,660,2140,35,45).color(color));
p.part("back-rim", b(0,185,660,2140,35,45).color(color));
p.part("end-cap-left", b(-1070,0,500,45,340,180).color(color));
p.part("end-cap-right", b(1070,0,500,45,340,180).color(color));
p.part("support-left", b(-760,0,0,65,430,500).color(color));
p.part("support-middle", b(0,0,0,65,430,500).color(color));
p.part("support-right", b(760,0,0,65,430,500).color(color));
p.part("feed-tube", b(0,-250,460,35,80,35).color(color));
p.part("drain-pickup", c(940,-155,330,165,30,10).color(color));

return p.model();
