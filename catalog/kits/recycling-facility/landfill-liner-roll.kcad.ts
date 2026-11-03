// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "landfill-liner-roll",
  license: 'CC0-1.0',
  title: "Landfill liner roll",
  description: "Landfill liner roll as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7c6955", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("landfill-liner-roll");
p.part("roll-cradle-left", b(-360.0,0,0,110,584.0,745.0).color(color));
p.part("roll-cradle-right", b(360.0,0,0,110,584.0,745.0).color(color));
p.part("liner-roll", cy(0,0,715.1999999999999,660.0,596.0,12).color(color));
p.part("end-core-left", c(-360.0,0,715.1999999999999,90,110,10).color(color));
p.part("end-core-right", c(360.0,0,715.1999999999999,90,110,10).color(color));
p.part("loose-liner", b(0,-255.49999999999997,0,800.0,160,55).color(color));
p.part("pull-bar", b(0,-270.1,55,820.0,60,65).color(color));

return p.model();
