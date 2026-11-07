// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "weighbridge-approach-ramp",
  license: 'CC0-1.0',
  title: "Weighbridge approach ramp",
  description: "Weighbridge approach ramp as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6c7882", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("weighbridge-approach-ramp");
p.part("ramp-apron", b(0,0,0,3000,1300,120).color(color));
p.part("ramp-surface", b(0,0,120,2800,1150,260).color(color));
p.part("side-curb-left", b(-1430,0,0,100,1350,380).color(color));
p.part("side-curb-right", b(1430,0,0,100,1350,380).color(color));
p.part("transition-plate", b(0,-690,100,2820,160,60).color(color));
p.part("ground-anchor-left", b(-1200,520,0,180,180,130).color(color));
p.part("ground-anchor-right", b(1200,520,0,180,180,130).color(color));
p.part("roller-left", c(-1250,-650,0,95,54,10).color(color));
p.part("roller-right", c(1250,-650,0,95,54,10).color(color));

return p.model();
