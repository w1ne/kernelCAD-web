// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "enclosed-it-rack",
  license: 'CC0-1.0',
  title: "Enclosed IT rack",
  description: "Full-height rack cabinet with front door frame, side panels, rails, and leveling feet. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#53616d", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("enclosed-it-rack");
p.part("base-plinth", b(0, 0, 0, 760, 1100, 80).color(color));
p.part("top-frame", b(0, 0, 2110, 760, 1100, 70).color(color));
p.part("front-left-post", b(-357.5, -527.5, 80, 45, 45, 2030).color(color));
p.part("front-right-post", b(357.5, -527.5, 80, 45, 45, 2030).color(color));
p.part("rear-left-post", b(-357.5, 527.5, 80, 45, 45, 2030).color(color));
p.part("rear-right-post", b(357.5, 527.5, 80, 45, 45, 2030).color(color));
p.part("front-rail-left", b(-280.0, -550.0, 120, 55, 35, 1960).color(color));
p.part("front-rail-right", b(280.0, -550.0, 120, 55, 35, 1960).color(color));
p.part("rear-crossbar", b(0, 515.0, 1210.0, 670, 45, 65).color(color));
p.part("leveling-foot-front-left", c(-335.0, -505.0, 0, 55, 32, 8).color(color));
p.part("leveling-foot-front-right", c(335.0, -505.0, 0, 55, 32, 8).color(color));
p.part("left-side-panel", b(-358.0, 0, 90, 28, 990, 2020).color(color));
p.part("right-side-panel", b(358.0, 0, 90, 28, 990, 2020).color(color));
p.part("rear-door", b(0, 525.0, 100, 665, 30, 2000).color(color));
p.part("front-door", b(0, -525.0, 100, 665, 30, 2000).color(color));
p.part("door-handle", b(243.20000000000002, -562.0, 924.0, 28, 25, 260).color(color));

return p.model();
