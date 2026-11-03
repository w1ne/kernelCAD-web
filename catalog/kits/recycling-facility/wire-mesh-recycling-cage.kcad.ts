// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "wire-mesh-recycling-cage",
  license: 'CC0-1.0',
  title: "Wire-mesh recycling cage",
  description: "Wire-mesh recycling cage as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#687b55", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("wire-mesh-recycling-cage");
p.part("skid-left", b(-453.3333333333333,0,0,90,980,100).color(color));
p.part("skid-right", b(453.3333333333333,0,0,90,980,100).color(color));
p.part("main-vessel", c(0,0,100,1200,333.20000000000005,12).color(color));
p.part("top-collar", c(0,0,1280,70,362.6,12).color(color));
p.part("access-neck", c(0,0,1350,100,140,10).color(color));
p.part("drain-stub", c(394.4,0,210,180,48,8).color(color));
p.part("level-gauge", b(489.59999999999997,-156.8,250,65,40,624.0).color(color));

return p.model();
