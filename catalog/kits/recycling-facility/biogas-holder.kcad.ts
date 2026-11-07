// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "biogas-holder",
  license: 'CC0-1.0',
  title: "Biogas holder",
  description: "Biogas holder as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "organics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#636e5b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("biogas-holder");
p.part("tank-foot-left-front", b(-368.0,-243.20000000000002,0,100,100,250).color(color));
p.part("tank-foot-right-front", b(368.0,-243.20000000000002,0,100,100,250).color(color));
p.part("tank-foot-left-back", b(-368.0,243.20000000000002,0,100,100,250).color(color));
p.part("tank-foot-right-back", b(368.0,243.20000000000002,0,100,100,250).color(color));
p.part("vessel-shell", c(0,0,220,1250,460.0,12).color(color));
p.part("top-flange", c(0,0,1470,70,494.5,12).color(color));
p.part("roof-cap", c(0,0,1540,160,425.5,12).color(color));
p.part("manway", c(0,0,1700,110,125,10).color(color));
p.part("vent-stack", c(299.0,0,1670,260,42,10).color(color));
p.part("access-ladder", b(494.5,0,220,65,70,1025.0).color(color));
p.part("outlet-pipe", b(391.0,-258.40000000000003,240,180,100,130).color(color));
p.part("drain-valve", c(414.0,-273.59999999999997,180,120,42,10).color(color));
p.part("side-nozzle", cy(448.5,228.0,587.5,180,58,10).color(color));
p.part("conical-discharge", c(0,0,100,180,299.0,12).color(color));
p.part("outlet-neck", b(0,0,0,170,170,100).color(color));

return p.model();
