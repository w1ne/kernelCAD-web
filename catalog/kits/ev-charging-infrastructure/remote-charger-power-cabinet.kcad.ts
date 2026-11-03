// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "remote-charger-power-cabinet",
  license: 'CC0-1.0',
  title: "Remote charger power cabinet",
  description: "Outdoor power cabinet with divided service doors, top vent slots, and cable-entry base. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6b7574", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("remote-charger-power-cabinet");
p.part("main-enclosure", b(0, 0, 90, 1150, 620, 1940).color(color));
p.part("base-plinth", b(0, 0, 0, 1205, 660, 90).color(color));
p.part("top-cap", b(0, 0, 2030, 1174, 644, 22).color(color));
p.part("door-seam-1", b(-287.5, -313.0, 155, 5, 8, 1820).color(color));
p.part("door-seam-2", b(287.5, -313.0, 155, 5, 8, 1820).color(color));
p.part("vent-slot-1", b(0, -318.0, 478.0, 667.0, 12, 12).color(color));
p.part("vent-slot-2", b(0, -318.0, 623.5, 667.0, 12, 12).color(color));
p.part("vent-slot-3", b(0, -318.0, 769.0, 667.0, 12, 12).color(color));
p.part("vent-slot-4", b(0, -318.0, 914.5, 667.0, 12, 12).color(color));
p.part("vent-slot-5", b(0, -318.0, 1060.0, 667.0, 12, 12).color(color));
p.part("cable-entry-skirt", b(0, 0, 30, 943.0, 558.0, 90).color(color));
p.part("ground-terminal", c(402.5, 0, 25, 50, 28, 8).color(color));

return p.model();
