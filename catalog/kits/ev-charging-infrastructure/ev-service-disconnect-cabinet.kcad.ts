// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ev-service-disconnect-cabinet",
  license: 'CC0-1.0',
  title: "EV service disconnect cabinet",
  description: "Outdoor service disconnect with a guarded handle, meter window, and lower cable entry. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6e756e", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("ev-service-disconnect-cabinet");
p.part("main-enclosure", b(0, 0, 90, 820, 480, 1700).color(color));
p.part("base-plinth", b(0, 0, 0, 875, 520, 90).color(color));
p.part("top-cap", b(0, 0, 1790, 844, 504, 22).color(color));
p.part("door-seam-1", b(-205.0, -243.0, 155, 5, 8, 1580).color(color));
p.part("door-seam-2", b(205.0, -243.0, 155, 5, 8, 1580).color(color));
p.part("display-bezel", b(0, -252.0, 1246.0, 377.2, 22, 289.0).color(color));
p.part("display-window", b(0, -265.0, 1263.0, 319.8, 7, 212.5).color(color));
p.part("status-button", c(278.8, -268.0, 906.0, 18, 12, 8).color(color));
p.part("vent-slot-1", b(0, -248.0, 430.0, 475.59999999999997, 12, 12).color(color));
p.part("vent-slot-2", b(0, -248.0, 557.5, 475.59999999999997, 12, 12).color(color));
p.part("vent-slot-3", b(0, -248.0, 685.0, 475.59999999999997, 12, 12).color(color));
p.part("vent-slot-4", b(0, -248.0, 812.5, 475.59999999999997, 12, 12).color(color));
p.part("vent-slot-5", b(0, -248.0, 940.0, 475.59999999999997, 12, 12).color(color));
p.part("cable-entry-skirt", b(0, 0, 30, 672.4, 432.0, 90).color(color));
p.part("ground-terminal", c(287.0, 0, 25, 50, 28, 8).color(color));
p.part("handle-guard", b(250, -260.0, 800, 95, 35, 270).color(color));
p.part("disconnect-handle", c(250, -290.0, 925, 35, 22, 8).color(color));

return p.model();
