// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "fleet-depot-dc-dispenser",
  license: 'CC0-1.0',
  title: "Fleet depot DC dispenser",
  description: "Fleet charger post with twin high-reach cables, overhead cable guides, and a reinforced foot. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5b6870", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("fleet-depot-dc-dispenser");
p.part("main-enclosure", b(0, 0, 90, 640, 430, 1780).color(color));
p.part("base-plinth", b(0, 0, 0, 695, 470, 90).color(color));
p.part("top-cap", b(0, 0, 1870, 664, 454, 22).color(color));
p.part("front-door", b(0, -218.0, 155, 614, 8, 1660).color(color));
p.part("display-bezel", b(0, -227.0, 1300.4, 294.40000000000003, 22, 302.6).color(color));
p.part("display-window", b(0, -240.0, 1318.1999999999998, 249.60000000000002, 7, 222.5).color(color));
p.part("status-button", c(217.60000000000002, -243.0, 944.4, 18, 12, 8).color(color));
p.part("vent-slot-1", b(0, -223.0, 446.0, 371.2, 12, 12).color(color));
p.part("vent-slot-2", b(0, -223.0, 579.5, 371.2, 12, 12).color(color));
p.part("vent-slot-3", b(0, -223.0, 713.0, 371.2, 12, 12).color(color));
p.part("vent-slot-4", b(0, -223.0, 846.5, 371.2, 12, 12).color(color));
p.part("vent-slot-5", b(0, -223.0, 980.0, 371.2, 12, 12).color(color));
p.part("roof-visor", b(0, -64.5, 1870, 720, 510, 42).color(color));
p.part("left-connector-cradle", hy(-371.2, -285.0, 470, 130, 38, 8).color(color));
p.part("right-connector-cradle", hy(371.2, -285.0, 470, 130, 38, 8).color(color));
p.part("left-charging-cable", hy(-371.2, -485.0, 260, 650, 22, 8).color(color));
p.part("right-charging-cable", hy(371.2, -485.0, 260, 650, 22, 8).color(color));

return p.model();
