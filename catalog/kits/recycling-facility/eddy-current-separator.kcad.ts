// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "eddy-current-separator",
  license: 'CC0-1.0',
  title: "Eddy-current separator",
  description: "Eddy-current separator as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#506c68", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("eddy-current-separator");
p.part("support-rail-left", b(-326.4,0,0,90,2020,170).color(color));
p.part("support-rail-right", b(326.4,0,0,90,2020,170).color(color));
p.part("screen-bed", b(0,0,265,598.4,1656.3999999999999,130).color(color));
p.part("feed-hopper", b(0,-929.2,185.6,557.6,350,313.20000000000005).color(color));
p.part("oversize-chute", b(0,949.4,208.79999999999998,530.4,360,260).color(color));
p.part("side-guard-left", b(-272.0,0,395,55,1616.0,180).color(color));
p.part("side-guard-right", b(272.0,0,395,55,1616.0,180).color(color));
p.part("vibrator-left", c(-170.0,0,525,220,85,10).color(color));
p.part("vibrator-right", c(170.0,0,525,220,85,10).color(color));
p.part("support-roller-1", cy(0,-686.8000000000001,110,90,75,10).color(color));
p.part("support-roller-2", cy(0,-242.4000000000001,110,90,75,10).color(color));
p.part("support-roller-3", cy(0,201.9999999999999,110,90,75,10).color(color));
p.part("support-roller-4", cy(0,646.3999999999997,110,90,75,10).color(color));

return p.model();
