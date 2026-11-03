// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "pelletizer-extruder",
  license: 'CC0-1.0',
  title: "Pelletizer extruder",
  description: "Pelletizer extruder as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "glass plastics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5f7484", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("pelletizer-extruder");
p.part("base-frame", b(0,0,0,1570,990,140).color(color));
p.part("machine-body", b(0,0,140,1287.3999999999999,772.2,850.0000000000001).color(color));
p.part("front-access-door", b(0,-415.8,220,816.4,60,550.0).color(color));
p.part("feed-chute", b(0,-534.6,675.0,1130.3999999999999,260,437.5).color(color));
p.part("outlet-chute", b(0,495.0,160,722.2,210,450.0).color(color));
p.part("service-panel", b(785.0,0,350.00000000000006,75,396.0,425.00000000000006).color(color));
p.part("control-pedestal", b(910.5999999999999,-297.0,0,240,260,700.0000000000001).color(color));
p.part("drive-drum", c(-863.5000000000001,0,525.0,370,120,10).color(color));
p.part("transfer-roller", cy(0,-376.2,590.1999999999999,100,565.1999999999999,10).color(color));

return p.model();
