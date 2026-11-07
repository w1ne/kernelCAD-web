// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "flood-drain-valve-manifold",
  license: 'CC0-1.0',
  title: "Flood-and-drain valve manifold",
  description: "Compact manifold panel with two valve bodies, branch outlets and a central riser. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5e8580", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("flood-drain-valve-manifold");
p.part("mounting-plate", b(0,0,0,650,260,50).color(color));
p.part("header-pipe", b(0,0,450,58,760,58).color(color));
p.part("left-branch", b(-270,0,190,58,420,58).color(color));
p.part("right-branch", b(270,0,190,58,420,58).color(color));
p.part("valve-handle-left", b(-270,-20,470,190,70,40).color(color));
p.part("valve-handle-right", b(270,-20,470,190,70,40).color(color));
p.part("outlet-rail", b(0,0,100,700,55,55).color(color));
p.part("valve-body-left", c(-270,0,245,130,72,10).color(color));
p.part("valve-body-right", c(270,0,245,130,72,10).color(color));
p.part("riser", c(0,0,50,450,28,10).color(color));
p.part("outlet-left", c(-280,0,70,170,24,10).color(color));
p.part("outlet-right", c(280,0,70,170,24,10).color(color));

return p.model();
