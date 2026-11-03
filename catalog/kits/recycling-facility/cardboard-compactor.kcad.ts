// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "cardboard-compactor",
  license: 'CC0-1.0',
  title: "Cardboard compactor",
  description: "Cardboard compactor as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
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

const p = assembly("cardboard-compactor");
p.part("base-skid", b(0,0,0,1180,850,125).color(color));
p.part("press-chamber", b(0,0,125,967.5999999999999,663.0,875.0).color(color));
p.part("front-door-frame", b(0,-365.5,160,802.4000000000001,110,675.0).color(color));
p.part("press-plate", b(0,-221.0,687.5,755.2,210,160).color(color));
p.part("upper-gantry", b(0,0,975.0,1132.8,765.0,160).color(color));
p.part("discharge-floor", b(0,-408.0,110,684.4,190,120).color(color));
p.part("control-cabinet", b(660.8000000000001,0,0,300,360,750.0).color(color));
p.part("hydraulic-cylinder", cy(0,204.0,912.5,280,115,10).color(color));
p.part("pressure-gauge", c(625.4,-187.0,700.0000000000001,120,45,10).color(color));

return p.model();
