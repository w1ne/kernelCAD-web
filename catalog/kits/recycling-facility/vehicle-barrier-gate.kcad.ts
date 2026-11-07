// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "vehicle-barrier-gate",
  license: 'CC0-1.0',
  title: "Vehicle barrier gate",
  description: "Vehicle barrier gate as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5d6985", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("vehicle-barrier-gate");
p.part("control-pedestal", b(-450.0,0,0,320,460,923.8).color(color));
p.part("counterweight-box", b(-450.0,0,923.8,360,500,120).color(color));
p.part("boom-arm", b(220,0,998.3000000000001,1220,90,90).color(color));
p.part("boom-tip", b(820.0,0,998.3000000000001,110,115,110).color(color));
p.part("photo-eye-post", b(790.0,-420.0,0,75,75,804.6).color(color));
p.part("beacon", c(-450.0,-200,923.8,110,54,10).color(color));
p.part("hinge-drum", c(-290.0,0,938.7,130,70,10).color(color));

return p.model();
