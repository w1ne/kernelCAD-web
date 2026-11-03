// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ev-site-distribution-panel",
  license: 'CC0-1.0',
  title: "EV site distribution panel",
  description: "Multi-bay panelboard with grouped breaker doors, indicator windows, and conduit stubs. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#707873", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("ev-site-distribution-panel");
p.part("main-enclosure", b(0, 0, 90, 1420, 600, 1930).color(color));
p.part("base-plinth", b(0, 0, 0, 1475, 640, 90).color(color));
p.part("top-cap", b(0, 0, 2020, 1444, 624, 22).color(color));
p.part("door-seam-1", b(-473.3333333333333, -303.0, 155, 5, 8, 1810).color(color));
p.part("door-seam-2", b(0.0, -303.0, 155, 5, 8, 1810).color(color));
p.part("door-seam-3", b(473.3333333333333, -303.0, 155, 5, 8, 1810).color(color));
p.part("display-bezel", b(0, -312.0, 1402.4, 653.2, 22, 328.1).color(color));
p.part("display-window", b(0, -325.0, 1421.6999999999998, 553.8000000000001, 7, 241.25).color(color));
p.part("status-button", c(482.8, -328.0, 1016.4, 18, 12, 8).color(color));
p.part("vent-slot-1", b(0, -308.0, 476.0, 823.5999999999999, 12, 12).color(color));
p.part("vent-slot-2", b(0, -308.0, 620.75, 823.5999999999999, 12, 12).color(color));
p.part("vent-slot-3", b(0, -308.0, 765.5, 823.5999999999999, 12, 12).color(color));
p.part("vent-slot-4", b(0, -308.0, 910.25, 823.5999999999999, 12, 12).color(color));
p.part("vent-slot-5", b(0, -308.0, 1055.0, 823.5999999999999, 12, 12).color(color));
p.part("cable-entry-skirt", b(0, 0, 30, 1164.3999999999999, 540.0, 90).color(color));
p.part("ground-terminal", c(496.99999999999994, 0, 25, 50, 28, 8).color(color));
p.part("conduit-left", c(-496.99999999999994, 0, 0, 210, 38, 8).color(color));
p.part("conduit-right", c(496.99999999999994, 0, 0, 210, 38, 8).color(color));

return p.model();
