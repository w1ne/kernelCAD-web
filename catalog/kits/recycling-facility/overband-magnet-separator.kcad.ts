// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "overband-magnet-separator",
  license: 'CC0-1.0',
  title: "Overband magnet separator",
  description: "Overband magnet separator as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#61727c", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("overband-magnet-separator");
p.part("support-rail-left", b(-422.4,0,0,90,1500,170).color(color));
p.part("support-rail-right", b(422.4,0,0,90,1500,170).color(color));
p.part("screen-bed", b(0,0,320,774.4,1230.0,130).color(color));
p.part("feed-hopper", b(0,-690.0,272.0,721.5999999999999,350,459.00000000000006).color(color));
p.part("oversize-chute", b(0,705.0,306.0,686.4,360,260).color(color));
p.part("side-guard-left", b(-352.0,0,450,55,1200.0,180).color(color));
p.part("side-guard-right", b(352.0,0,450,55,1200.0,180).color(color));
p.part("vibrator-left", c(-220.0,0,580,220,85,10).color(color));
p.part("vibrator-right", c(220.0,0,580,220,85,10).color(color));
p.part("support-roller-1", cy(0,-510.00000000000006,110,90,75,10).color(color));
p.part("support-roller-2", cy(0,-180.00000000000006,110,90,75,10).color(color));
p.part("support-roller-3", cy(0,149.99999999999994,110,90,75,10).color(color));
p.part("support-roller-4", cy(0,479.99999999999994,110,90,75,10).color(color));

return p.model();
