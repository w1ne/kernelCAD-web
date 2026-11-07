// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "recovered-bale-wrapper",
  license: 'CC0-1.0',
  title: "Recovered-material bale wrapper",
  description: "Recovered-material bale wrapper as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5f7380", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("recovered-bale-wrapper");
p.part("base-frame", b(0,0,0,1050,990,140).color(color));
p.part("machine-body", b(0,0,140,861.0,772.2,952.0000000000001).color(color));
p.part("front-access-door", b(0,-415.8,220,546.0,60,616.0).color(color));
p.part("feed-chute", b(0,-534.6,756.0,756.0,260,489.99999999999994).color(color));
p.part("outlet-chute", b(0,495.0,160,483.0,210,504.0).color(color));
p.part("service-panel", b(525.0,0,392.00000000000006,75,396.0,476.00000000000006).color(color));
p.part("control-pedestal", b(609.0,-297.0,0,240,260,784.0000000000001).color(color));
p.part("drive-drum", c(-577.5,0,588.0,370,120,10).color(color));
p.part("transfer-roller", cy(0,-376.2,403.0,100,378.0,10).color(color));

return p.model();
