// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "compact-dc-fast-charger",
  license: 'CC0-1.0',
  title: "Compact DC fast charger",
  description: "Floor-standing DC charger with a front display, service door, and paired charging leads. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#536c77", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("compact-dc-fast-charger");
p.part("main-enclosure", b(0, 0, 90, 610, 460, 1620).color(color));
p.part("base-plinth", b(0, 0, 0, 665, 500, 90).color(color));
p.part("top-cap", b(0, 0, 1710, 634, 484, 22).color(color));
p.part("front-door", b(0, -233.0, 155, 584, 8, 1500).color(color));
p.part("display-bezel", b(0, -242.0, 1191.6000000000001, 280.6, 22, 275.40000000000003).color(color));
p.part("display-window", b(0, -255.0, 1207.8, 237.9, 7, 202.5).color(color));
p.part("status-button", c(207.4, -258.0, 867.6, 18, 12, 8).color(color));
p.part("vent-slot-1", b(0, -238.0, 414.0, 353.79999999999995, 12, 12).color(color));
p.part("vent-slot-2", b(0, -238.0, 535.5, 353.79999999999995, 12, 12).color(color));
p.part("vent-slot-3", b(0, -238.0, 657.0, 353.79999999999995, 12, 12).color(color));
p.part("vent-slot-4", b(0, -238.0, 778.5, 353.79999999999995, 12, 12).color(color));
p.part("vent-slot-5", b(0, -238.0, 900.0, 353.79999999999995, 12, 12).color(color));
p.part("roof-visor", b(0, -69.0, 1710, 690, 540, 42).color(color));
p.part("left-connector-cradle", hy(-353.79999999999995, -300.0, 470, 130, 38, 8).color(color));
p.part("right-connector-cradle", hy(353.79999999999995, -300.0, 470, 130, 38, 8).color(color));
p.part("left-charging-cable", hy(-353.79999999999995, -500.0, 260, 650, 22, 8).color(color));
p.part("right-charging-cable", hy(353.79999999999995, -500.0, 260, 650, 22, 8).color(color));

return p.model();
