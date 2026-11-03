// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "vibrating-grizzly",
  license: 'CC0-1.0',
  title: "Vibrating grizzly",
  description: "Vibrating grizzly as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
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
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("vibrating-grizzly");
p.part("support-rail-left", b(-470.4,0,0,90,2280,170).color(color));
p.part("support-rail-right", b(470.4,0,0,90,2280,170).color(color));
p.part("screen-bed", b(0,0,210,862.4,1869.6,130).color(color));
p.part("feed-hopper", b(0,-1048.8,315.2,803.5999999999999,350,531.9000000000001).color(color));
p.part("oversize-chute", b(0,1071.6,354.59999999999997,764.4,360,260).color(color));
p.part("side-guard-left", b(-392.0,0,340,55,1824.0,180).color(color));
p.part("side-guard-right", b(392.0,0,340,55,1824.0,180).color(color));
p.part("vibrator-left", c(-245.0,0,470,220,85,10).color(color));
p.part("vibrator-right", c(245.0,0,470,220,85,10).color(color));
p.part("support-roller-1", cy(0,-775.2,110,90,75,10).color(color));
p.part("support-roller-2", cy(0,-273.6,110,90,75,10).color(color));
p.part("support-roller-3", cy(0,228.0,110,90,75,10).color(color));
p.part("support-roller-4", cy(0,729.6000000000001,110,90,75,10).color(color));

return p.model();
