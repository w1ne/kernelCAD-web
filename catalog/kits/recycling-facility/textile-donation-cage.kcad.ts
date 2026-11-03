// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "textile-donation-cage",
  license: 'CC0-1.0',
  title: "Textile donation cage",
  description: "Textile donation cage as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#60766f", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("textile-donation-cage");
p.part("cart-body", b(0,0,80,1131.0,735.0,712.8).color(color));
p.part("front-lip", b(0,-411.59999999999997,712.8,1189.0,60,85).color(color));
p.part("push-handle-left", b(-493.00000000000006,343.0,80,65,65,594.0).color(color));
p.part("push-handle-right", b(493.00000000000006,343.0,80,65,65,594.0).color(color));
p.part("handle-grip", b(0,343.0,633.6,1058.5,70,65).color(color));
p.part("left-wheel", cy(-467.75,407.0,76,64,76,10).color(color));
p.part("right-wheel", cy(467.75,407.0,76,64,76,10).color(color));
p.part("left-wheel-far", cy(-467.75,-279.0,76,64,76,10).color(color));
p.part("right-wheel-far", cy(467.75,-279.0,76,64,76,10).color(color));

return p.model();
