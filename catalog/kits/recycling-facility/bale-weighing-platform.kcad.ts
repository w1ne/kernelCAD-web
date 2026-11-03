// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "bale-weighing-platform",
  license: 'CC0-1.0',
  title: "Bale weighing platform",
  description: "Bale weighing platform as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6b7756", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("bale-weighing-platform");
p.part("base-frame", b(0,0,0,1180,1130,140).color(color));
p.part("machine-body", b(0,0,140,967.5999999999999,881.4,1054.0).color(color));
p.part("front-access-door", b(0,-474.59999999999997,220,613.6,60,682.0).color(color));
p.part("feed-chute", b(0,-610.2,837.0,849.6,260,542.5).color(color));
p.part("outlet-chute", b(0,565.0,160,542.8000000000001,210,558.0).color(color));
p.part("service-panel", b(590.0,0,434.00000000000006,75,452.0,527.0).color(color));
p.part("control-pedestal", b(684.4,-339.0,0,240,260,868.0000000000001).color(color));
p.part("drive-drum", c(-649.0,0,651.0,370,120,10).color(color));
p.part("transfer-roller", cy(0,-429.4,449.8,100,424.8,10).color(color));

return p.model();
