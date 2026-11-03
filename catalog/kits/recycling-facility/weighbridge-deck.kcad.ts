// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "weighbridge-deck",
  license: 'CC0-1.0',
  title: "Weighbridge deck",
  description: "Weighbridge deck as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#47758a", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("weighbridge-deck");
p.part("scale-deck", b(0,0,150,5000,2800,210).color(color));
p.part("side-beam-left", b(-2300,0,50,180,2700,160).color(color));
p.part("side-beam-right", b(2300,0,50,180,2700,160).color(color));
p.part("approach-pad-front", b(0,-1550,0,5200,700,150).color(color));
p.part("approach-pad-back", b(0,1550,0,5200,700,150).color(color));
p.part("load-cell-a", c(-1850,-950,0,150,90,10).color(color));
p.part("load-cell-b", c(1850,-950,0,150,90,10).color(color));
p.part("load-cell-c", c(-1850,950,0,150,90,10).color(color));
p.part("load-cell-d", c(1850,950,0,150,90,10).color(color));

return p.model();
