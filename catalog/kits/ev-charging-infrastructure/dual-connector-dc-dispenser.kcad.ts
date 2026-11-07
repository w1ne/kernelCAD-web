// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "dual-connector-dc-dispenser",
  license: 'CC0-1.0',
  title: "Dual-connector DC dispenser",
  description: "Public DC charging dispenser with two plug cradles, a central status display, and cable loops. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#536a75", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("dual-connector-dc-dispenser");
p.part("main-enclosure", b(0, 0, 90, 560, 390, 1760).color(color));
p.part("base-plinth", b(0, 0, 0, 615, 430, 90).color(color));
p.part("top-cap", b(0, 0, 1850, 584, 414, 22).color(color));
p.part("front-door", b(0, -198.0, 155, 534, 8, 1640).color(color));
p.part("display-bezel", b(0, -207.0, 1286.8000000000002, 257.6, 22, 299.20000000000005).color(color));
p.part("display-window", b(0, -220.0, 1304.3999999999999, 218.4, 7, 220.0).color(color));
p.part("status-button", c(190.4, -223.0, 934.8, 18, 12, 8).color(color));
p.part("vent-slot-1", b(0, -203.0, 442.0, 324.79999999999995, 12, 12).color(color));
p.part("vent-slot-2", b(0, -203.0, 574.0, 324.79999999999995, 12, 12).color(color));
p.part("vent-slot-3", b(0, -203.0, 706.0, 324.79999999999995, 12, 12).color(color));
p.part("vent-slot-4", b(0, -203.0, 838.0, 324.79999999999995, 12, 12).color(color));
p.part("vent-slot-5", b(0, -203.0, 970.0, 324.79999999999995, 12, 12).color(color));
p.part("roof-visor", b(0, -58.5, 1850, 640, 470, 42).color(color));
p.part("left-connector-cradle", hy(-324.79999999999995, -265.0, 470, 130, 38, 8).color(color));
p.part("right-connector-cradle", hy(324.79999999999995, -265.0, 470, 130, 38, 8).color(color));
p.part("left-charging-cable", hy(-324.79999999999995, -465.0, 260, 650, 22, 8).color(color));
p.part("right-charging-cable", hy(324.79999999999995, -465.0, 260, 650, 22, 8).color(color));

return p.model();
