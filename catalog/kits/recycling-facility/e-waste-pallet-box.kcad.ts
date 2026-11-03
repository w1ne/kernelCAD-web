// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "e-waste-pallet-box",
  license: 'CC0-1.0',
  title: "E-waste pallet box",
  description: "E-waste pallet box as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#806d5d", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("e-waste-pallet-box");
p.part("skid-left", b(-393.3333333333333,0,0,90,980,100).color(color));
p.part("skid-right", b(393.3333333333333,0,0,90,980,100).color(color));
p.part("main-vessel", c(0,0,100,1130,333.20000000000005,12).color(color));
p.part("top-collar", c(0,0,1210,70,362.6,12).color(color));
p.part("access-neck", c(0,0,1280,100,140,10).color(color));
p.part("drain-stub", c(342.2,0,210,180,48,8).color(color));
p.part("level-gauge", b(424.8,-156.8,250,65,40,587.6).color(color));

return p.model();
