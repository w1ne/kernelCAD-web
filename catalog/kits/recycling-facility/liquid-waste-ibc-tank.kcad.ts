// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "liquid-waste-ibc-tank",
  license: 'CC0-1.0',
  title: "Liquid waste IBC tank",
  description: "Liquid waste IBC tank as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#707b86", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("liquid-waste-ibc-tank");
p.part("pallet-skid", b(0,0,0,950,980,120).color(color));
p.part("inner-tank", b(0,0,120,741.0,764.4,1072.8).color(color));
p.part("top-cap", b(0,0,1192.8,779.0,803.5999999999999,65).color(color));
p.part("fill-neck", c(0,0,1257.8,110,90,10).color(color));
p.part("cage-post--1--1", b(-418.0,-431.2,120,48,48,1072.8).color(color));
p.part("cage-post--1-1", b(-418.0,431.2,120,48,48,1072.8).color(color));
p.part("cage-post-1--1", b(418.0,-431.2,120,48,48,1072.8).color(color));
p.part("cage-post-1-1", b(418.0,431.2,120,48,48,1072.8).color(color));
p.part("cage-rail-front-0", b(0,-421.4,220.0,798.0,35,30).color(color));
p.part("cage-rail-back-0", b(0,421.4,220.0,798.0,35,30).color(color));
p.part("cage-rail-front-1", b(0,-421.4,577.5999999999999,798.0,35,30).color(color));
p.part("cage-rail-back-1", b(0,421.4,577.5999999999999,798.0,35,30).color(color));
p.part("cage-rail-front-2", b(0,-421.4,935.1999999999999,798.0,35,30).color(color));
p.part("cage-rail-back-2", b(0,421.4,935.1999999999999,798.0,35,30).color(color));
p.part("valve-guard", b(0,-450.8,150,250,55,170).color(color));
p.part("outlet-valve", c(0,-480.2,145,90,48,10).color(color));

return p.model();
