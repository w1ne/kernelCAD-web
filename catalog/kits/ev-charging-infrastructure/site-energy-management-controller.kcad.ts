// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "site-energy-management-controller",
  license: 'CC0-1.0',
  title: "Site energy management controller",
  description: "Wall enclosure with a control screen, antenna pair, and cable glands. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#55676b", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("site-energy-management-controller");
p.part("mounting-plate", b(0, 45, 0, 560, 30, 780).color(color));
p.part("main-enclosure", b(0, 0, 0, 510, 300, 730).color(color));
p.part("top-cap", b(0, 0, 730, 534, 324, 22).color(color));
p.part("front-door", b(0, -153.0, 65, 484, 8, 610).color(color));
p.part("display-bezel", b(0, -162.0, 496.40000000000003, 234.60000000000002, 22, 124.10000000000001).color(color));
p.part("display-window", b(0, -175.0, 503.7, 198.9, 7, 91.25).color(color));
p.part("status-button", c(173.4, -178.0, 350.4, 18, 12, 8).color(color));
p.part("vent-slot-1", b(0, -158.0, 146.0, 295.79999999999995, 12, 12).color(color));
p.part("vent-slot-2", b(0, -158.0, 200.75000000000003, 295.79999999999995, 12, 12).color(color));
p.part("antenna-left", c(-180, 80, 770, 330, 18, 8).color(color));
p.part("antenna-right", c(180, 80, 770, 330, 18, 8).color(color));
p.part("cable-gland-strip", b(0, -20, 20, 420, 70, 80).color(color));

return p.model();
