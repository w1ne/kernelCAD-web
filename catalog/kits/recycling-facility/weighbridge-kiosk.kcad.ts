// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "weighbridge-kiosk",
  license: 'CC0-1.0',
  title: "Weighbridge kiosk",
  description: "Weighbridge kiosk as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7b6f56", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("weighbridge-kiosk");
p.part("floor-skid", b(0,0,0,1560,620,90).color(color));
p.part("rear-wall", b(0,270.0,90,1560,80,1180).color(color));
p.part("left-wall", b(-740.0,0,90,80,540,1180).color(color));
p.part("right-wall", b(740.0,0,90,80,540,1180).color(color));
p.part("front-counter", b(0,-240.0,90,1560,140,482.6).color(color));
p.part("roof", b(0,0,1220,1660,720,100).color(color));
p.part("window-header", b(0,-235.0,914.4,1123.2,45,55).color(color));
p.part("service-panel", b(0,-255.0,647.7,842.4000000000001,40,279.4).color(color));
p.part("corner-beacon", c(592.8,-235.6,1110,100,45,10).color(color));

return p.model();
