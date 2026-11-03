// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "cover-soil-spreader",
  license: 'CC0-1.0',
  title: "Cover-soil spreader",
  description: "Cover-soil spreader as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6e775d", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("cover-soil-spreader");
p.part("base-frame", b(0,0,0,1180,990,140).color(color));
p.part("machine-body", b(0,0,140,967.5999999999999,772.2,1156.0).color(color));
p.part("front-access-door", b(0,-415.8,220,613.6,60,748.0).color(color));
p.part("feed-chute", b(0,-534.6,918.0000000000001,849.6,260,595.0).color(color));
p.part("outlet-chute", b(0,495.0,160,542.8000000000001,210,612.0).color(color));
p.part("service-panel", b(590.0,0,476.00000000000006,75,396.0,578.0).color(color));
p.part("control-pedestal", b(684.4,-297.0,0,240,260,952.0000000000001).color(color));
p.part("drive-drum", c(-649.0,0,714.0,370,120,10).color(color));
p.part("transfer-roller", cy(0,-376.2,449.8,100,424.8,10).color(color));

return p.model();
