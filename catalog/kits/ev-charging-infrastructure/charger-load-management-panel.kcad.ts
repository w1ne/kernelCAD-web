// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "charger-load-management-panel",
  license: 'CC0-1.0',
  title: "Charger load-management panel",
  description: "Wall panel with a central controller display, service door, and connection terminals. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#68746f", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("charger-load-management-panel");
p.part("main-enclosure", b(0, 0, 90, 680, 260, 840).color(color));
p.part("base-plinth", b(0, 0, 0, 735, 300, 90).color(color));
p.part("top-cap", b(0, 0, 930, 704, 284, 22).color(color));
p.part("door-seam-1", b(-170.0, -133.0, 155, 5, 8, 720).color(color));
p.part("door-seam-2", b(170.0, -133.0, 155, 5, 8, 720).color(color));
p.part("display-bezel", b(0, -142.0, 661.2, 312.8, 22, 142.8).color(color));
p.part("display-window", b(0, -155.0, 669.5999999999999, 265.2, 7, 105.0).color(color));
p.part("status-button", c(231.20000000000002, -158.0, 493.2, 18, 12, 8).color(color));
p.part("vent-slot-1", b(0, -138.0, 258.0, 394.4, 12, 12).color(color));
p.part("vent-slot-2", b(0, -138.0, 321.0, 394.4, 12, 12).color(color));
p.part("vent-slot-3", b(0, -138.0, 384.0, 394.4, 12, 12).color(color));
p.part("vent-slot-4", b(0, -138.0, 447.0, 394.4, 12, 12).color(color));
p.part("vent-slot-5", b(0, -138.0, 510.0, 394.4, 12, 12).color(color));
p.part("cable-entry-skirt", b(0, 0, 30, 557.6, 234.0, 90).color(color));
p.part("ground-terminal", c(237.99999999999997, 0, 25, 50, 28, 8).color(color));

return p.model();
