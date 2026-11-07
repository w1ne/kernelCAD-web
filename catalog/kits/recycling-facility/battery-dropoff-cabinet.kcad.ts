// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "battery-dropoff-cabinet",
  license: 'CC0-1.0',
  title: "Battery drop-off cabinet",
  description: "Battery drop-off cabinet as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#55766b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("battery-dropoff-cabinet");
p.part("foundation", b(0,0,0,1464.0,682.0,100).color(color));
p.part("equipment-body", b(0,0,100,1220,620,800.4).color(color));
p.part("top-panel", b(0,0,900.4,1281.0,651.0,80).color(color));
p.part("screen-face", b(0,-335.0,593.4,561.2,35,441.6).color(color));
p.part("button-panel", b(402.6,-340.0,160,219.6,40,210).color(color));
p.part("mount-foot-a", c(-427.0,210.8,0,100,45,10).color(color));
p.part("mount-foot-b", c(427.0,210.8,0,100,45,10).color(color));
p.part("side-grip", cy(-658.8000000000001,80,482.99999999999994,110,32,10).color(color));

return p.model();
