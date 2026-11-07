// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "deep-water-culture-bed",
  license: 'CC0-1.0',
  title: "Deep-water culture bed",
  description: "Rectangular raft culture trough with a raised rim, flotation deck panels and a drain outlet. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#627e7a", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("deep-water-culture-bed");
p.part("trough-base", b(0,0,0,1800,1250,150).color(color));
p.part("front-wall", b(0,-590,150,1800,70,450).color(color));
p.part("back-wall", b(0,590,150,1800,70,450).color(color));
p.part("left-wall", b(-865,0,150,70,1110,450).color(color));
p.part("right-wall", b(865,0,150,70,1110,450).color(color));
p.part("raft-panel-a", b(-450,0,570,770,1070,60).color(color));
p.part("raft-panel-b", b(420,0,570,770,1070,60).color(color));
p.part("rim-front", b(0,-625,600,1850,70,65).color(color));
p.part("rim-back", b(0,625,600,1850,70,65).color(color));
p.part("drain-outlet", c(0,-680,180,230,48,10).color(color));

return p.model();
