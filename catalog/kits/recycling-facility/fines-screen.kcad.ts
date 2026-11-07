// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "fines-screen",
  license: 'CC0-1.0',
  title: "Fines screen",
  description: "Fines screen as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8b754b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("fines-screen");
p.part("support-rail-left", b(-374.4,0,0,90,1760,170).color(color));
p.part("support-rail-right", b(374.4,0,0,90,1760,170).color(color));
p.part("screen-bed", b(0,0,265,686.4,1443.1999999999998,130).color(color));
p.part("feed-hopper", b(0,-809.6,228.8,639.5999999999999,350,386.1).color(color));
p.part("oversize-chute", b(0,827.1999999999999,257.4,608.4,360,260).color(color));
p.part("side-guard-left", b(-312.0,0,395,55,1408.0,180).color(color));
p.part("side-guard-right", b(312.0,0,395,55,1408.0,180).color(color));
p.part("vibrator-left", c(-195.0,0,525,220,85,10).color(color));
p.part("vibrator-right", c(195.0,0,525,220,85,10).color(color));
p.part("support-roller-1", cy(0,-598.4000000000001,110,90,75,10).color(color));
p.part("support-roller-2", cy(0,-211.2000000000001,110,90,75,10).color(color));
p.part("support-roller-3", cy(0,175.9999999999999,110,90,75,10).color(color));
p.part("support-roller-4", cy(0,563.1999999999998,110,90,75,10).color(color));

return p.model();
