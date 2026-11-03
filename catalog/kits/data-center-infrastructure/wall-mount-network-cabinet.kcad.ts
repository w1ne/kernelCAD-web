// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "wall-mount-network-cabinet",
  license: 'CC0-1.0',
  title: "Wall-mount network cabinet",
  description: "Compact wall cabinet with framed door, mounting ears, and cable-entry plate. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#64717a", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("wall-mount-network-cabinet");
p.part("base-plinth", b(0, 0, 0, 600, 500, 80).color(color));
p.part("top-frame", b(0, 0, 730, 600, 500, 70).color(color));
p.part("front-left-post", b(-277.5, -227.5, 80, 45, 45, 650).color(color));
p.part("front-right-post", b(277.5, -227.5, 80, 45, 45, 650).color(color));
p.part("rear-left-post", b(-277.5, 227.5, 80, 45, 45, 650).color(color));
p.part("rear-right-post", b(277.5, 227.5, 80, 45, 45, 650).color(color));
p.part("front-rail-left", b(-200.0, -250.0, 120, 55, 35, 580).color(color));
p.part("front-rail-right", b(200.0, -250.0, 120, 55, 35, 580).color(color));
p.part("rear-crossbar", b(0, 215.0, 451.00000000000006, 510, 45, 65).color(color));
p.part("leveling-foot-front-left", c(-255.0, -205.0, 0, 55, 32, 8).color(color));
p.part("leveling-foot-front-right", c(255.0, -205.0, 0, 55, 32, 8).color(color));
p.part("rear-mounting-plate", b(0, 230.0, 100, 515, 35, 620).color(color));
p.part("front-door", b(0, -230.0, 120, 500, 24, 590).color(color));
p.part("left-mounting-ear", b(-335.0, 230.0, 369.0, 50, 35, 574.0).color(color));
p.part("right-mounting-ear", b(335.0, 230.0, 369.0, 50, 35, 574.0).color(color));
p.part("door-lock", c(180.0, -268.0, 410.0, 32, 22, 8).color(color));

return p.model();
