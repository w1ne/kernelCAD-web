// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "scrap-steel-stillage",
  license: 'CC0-1.0',
  title: "Scrap-steel stillage",
  description: "Scrap-steel stillage as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#4f7080", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("scrap-steel-stillage");
p.part("cart-body", b(0,0,80,990.6,735.0,662.4).color(color));
p.part("front-lip", b(0,-411.59999999999997,662.4,1041.3999999999999,60,85).color(color));
p.part("push-handle-left", b(-431.8,343.0,80,65,65,552.0).color(color));
p.part("push-handle-right", b(431.8,343.0,80,65,65,552.0).color(color));
p.part("handle-grip", b(0,343.0,588.8000000000001,927.1,70,65).color(color));
p.part("left-wheel", cy(-400.25,407.0,76,64,76,10).color(color));
p.part("right-wheel", cy(400.25,407.0,76,64,76,10).color(color));
p.part("left-wheel-far", cy(-400.25,-279.0,76,64,76,10).color(color));
p.part("right-wheel-far", cy(400.25,-279.0,76,64,76,10).color(color));

return p.model();
