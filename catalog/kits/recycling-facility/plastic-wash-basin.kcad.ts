// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "plastic-wash-basin",
  license: 'CC0-1.0',
  title: "Plastic wash basin",
  description: "Plastic wash basin as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "glass plastics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#4a7980", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("plastic-wash-basin");
p.part("base-frame", b(0,0,0,1440,990,140).color(color));
p.part("machine-body", b(0,0,140,1180.8,772.2,1054.0).color(color));
p.part("front-access-door", b(0,-415.8,220,748.8000000000001,60,682.0).color(color));
p.part("feed-chute", b(0,-534.6,837.0,1036.8,260,542.5).color(color));
p.part("outlet-chute", b(0,495.0,160,662.4,210,558.0).color(color));
p.part("service-panel", b(720.0,0,434.00000000000006,75,396.0,527.0).color(color));
p.part("control-pedestal", b(835.1999999999999,-297.0,0,240,260,868.0000000000001).color(color));
p.part("drive-drum", c(-792.0000000000001,0,651.0,370,120,10).color(color));
p.part("transfer-roller", cy(0,-376.2,543.4,100,518.4,10).color(color));

return p.model();
