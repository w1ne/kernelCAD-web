// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "glass-loadout-silo",
  license: 'CC0-1.0',
  title: "Glass load-out silo",
  description: "Glass load-out silo as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "glass plastics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5e6982", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("glass-loadout-silo");
p.part("tank-foot-left-front", b(-272.0,-313.6,0,100,100,250).color(color));
p.part("tank-foot-right-front", b(272.0,-313.6,0,100,100,250).color(color));
p.part("tank-foot-left-back", b(-272.0,313.6,0,100,100,250).color(color));
p.part("tank-foot-right-back", b(272.0,313.6,0,100,100,250).color(color));
p.part("vessel-shell", c(0,0,220,1370,340.0,12).color(color));
p.part("top-flange", c(0,0,1590,70,365.5,12).color(color));
p.part("roof-cap", c(0,0,1660,160,314.5,12).color(color));
p.part("manway", c(0,0,1820,110,125,10).color(color));
p.part("vent-stack", c(221.0,0,1790,260,42,10).color(color));
p.part("access-ladder", b(365.5,0,220,65,70,1123.3999999999999).color(color));
p.part("outlet-pipe", b(289.0,-333.20000000000005,240,180,100,130).color(color));
p.part("drain-valve", c(306.0,-352.8,180,120,42,10).color(color));
p.part("side-nozzle", cy(331.5,294.0,643.9,180,58,10).color(color));
p.part("conical-discharge", c(0,0,100,180,221.0,12).color(color));
p.part("outlet-neck", b(0,0,0,170,170,100).color(color));

return p.model();
