// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "geomembrane-welder",
  license: 'CC0-1.0',
  title: "Geomembrane welder",
  description: "Geomembrane welder as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5c6c7b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("geomembrane-welder");
p.part("base-frame", b(0,0,0,1440,1130,140).color(color));
p.part("machine-body", b(0,0,140,1180.8,881.4,1156.0).color(color));
p.part("front-access-door", b(0,-474.59999999999997,220,748.8000000000001,60,748.0).color(color));
p.part("feed-chute", b(0,-610.2,918.0000000000001,1036.8,260,595.0).color(color));
p.part("outlet-chute", b(0,565.0,160,662.4,210,612.0).color(color));
p.part("service-panel", b(720.0,0,476.00000000000006,75,452.0,578.0).color(color));
p.part("control-pedestal", b(835.1999999999999,-339.0,0,240,260,952.0000000000001).color(color));
p.part("drive-drum", c(-792.0000000000001,0,714.0,370,120,10).color(color));
p.part("transfer-roller", cy(0,-429.4,543.4,100,518.4,10).color(color));

return p.model();
