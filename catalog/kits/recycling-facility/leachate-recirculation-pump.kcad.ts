// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "leachate-recirculation-pump",
  license: 'CC0-1.0',
  title: "Leachate recirculation pump",
  description: "Leachate recirculation pump as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "organics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5e7759", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("leachate-recirculation-pump");
p.part("base-frame", b(0,0,0,1050,1130,140).color(color));
p.part("machine-body", b(0,0,140,861.0,881.4,850.0000000000001).color(color));
p.part("front-access-door", b(0,-474.59999999999997,220,546.0,60,550.0).color(color));
p.part("feed-chute", b(0,-610.2,675.0,756.0,260,437.5).color(color));
p.part("outlet-chute", b(0,565.0,160,483.0,210,450.0).color(color));
p.part("service-panel", b(525.0,0,350.00000000000006,75,452.0,425.00000000000006).color(color));
p.part("control-pedestal", b(609.0,-339.0,0,240,260,700.0000000000001).color(color));
p.part("drive-drum", c(-577.5,0,525.0,370,120,10).color(color));
p.part("transfer-roller", cy(0,-429.4,403.0,100,378.0,10).color(color));

return p.model();
