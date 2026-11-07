// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "conveyor-transfer-tower",
  license: 'CC0-1.0',
  title: "Conveyor transfer tower",
  description: "Conveyor transfer tower as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#75656d", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("conveyor-transfer-tower");
p.part("support-frame-left", b(-353.6,0,0,95,2006.4,580).color(color));
p.part("support-frame-right", b(353.6,0,0,95,2006.4,580).color(color));
p.part("upper-crossbeam", b(0,0,580,781.9999999999999,125,100).color(color));
p.part("material-channel", b(0,0,301.6,510.0,1641.6,170).color(color));
p.part("inspection-hood", b(0,-273.59999999999997,680,612.0,866.4,240).color(color));
p.part("discharge-transition", b(0,957.5999999999999,185.6,421.6,340,348.0).color(color));
p.part("access-ladder", b(408.0,456.0,0,75,80,522.0).color(color));
p.part("idler", cy(0,-775.2,344.59999999999997,95,319.59999999999997,10).color(color));

return p.model();
