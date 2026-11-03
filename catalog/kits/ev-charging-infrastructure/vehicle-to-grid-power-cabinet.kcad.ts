// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "vehicle-to-grid-power-cabinet",
  license: 'CC0-1.0',
  title: "Vehicle-to-grid power cabinet",
  description: "Bidirectional power cabinet with converter bays, a control window, and bus-cable exits. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5c6d71", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("vehicle-to-grid-power-cabinet");
p.part("main-enclosure", b(0, 0, 90, 1040, 560, 1860).color(color));
p.part("base-plinth", b(0, 0, 0, 1095, 600, 90).color(color));
p.part("top-cap", b(0, 0, 1950, 1064, 584, 22).color(color));
p.part("door-seam-1", b(-260.0, -283.0, 155, 5, 8, 1740).color(color));
p.part("door-seam-2", b(260.0, -283.0, 155, 5, 8, 1740).color(color));
p.part("display-bezel", b(0, -292.0, 1354.8000000000002, 478.40000000000003, 22, 316.20000000000005).color(color));
p.part("display-window", b(0, -305.0, 1373.3999999999999, 405.6, 7, 232.5).color(color));
p.part("status-button", c(353.6, -308.0, 982.8, 18, 12, 8).color(color));
p.part("vent-slot-1", b(0, -288.0, 462.0, 603.1999999999999, 12, 12).color(color));
p.part("vent-slot-2", b(0, -288.0, 601.5, 603.1999999999999, 12, 12).color(color));
p.part("vent-slot-3", b(0, -288.0, 741.0, 603.1999999999999, 12, 12).color(color));
p.part("vent-slot-4", b(0, -288.0, 880.5, 603.1999999999999, 12, 12).color(color));
p.part("vent-slot-5", b(0, -288.0, 1020.0, 603.1999999999999, 12, 12).color(color));
p.part("cable-entry-skirt", b(0, 0, 30, 852.8, 504.0, 90).color(color));
p.part("ground-terminal", c(364.0, 0, 25, 50, 28, 8).color(color));

return p.model();
