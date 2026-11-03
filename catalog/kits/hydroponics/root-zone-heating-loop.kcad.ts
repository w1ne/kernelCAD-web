// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "root-zone-heating-loop",
  license: 'CC0-1.0',
  title: "Root-zone heating loop",
  description: "Compact bench loop manifold with three parallel heating runs, end headers and two service risers. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7b8172", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("root-zone-heating-loop");
p.part("left-header", b(-620,0,80,70,980,70).color(color));
p.part("right-header", b(620,0,80,70,980,70).color(color));
p.part("run-front", b(0,-320,80,1180,45,45).color(color));
p.part("run-center", b(0,0,80,1180,45,45).color(color));
p.part("run-back", b(0,320,80,1180,45,45).color(color));
p.part("support-front-left", b(-540,-380,0,90,90,80).color(color));
p.part("support-front-right", b(540,-380,0,90,90,80).color(color));
p.part("support-back-left", b(-540,380,0,90,90,80).color(color));
p.part("support-back-right", b(540,380,0,90,90,80).color(color));
p.part("inlet-riser", c(-620,-500,0,180,35,10).color(color));
p.part("outlet-riser", c(620,500,0,180,35,10).color(color));
p.part("control-valve", c(-620,-500,180,95,42,10).color(color));

return p.model();
