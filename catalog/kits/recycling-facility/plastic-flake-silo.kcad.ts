// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "plastic-flake-silo",
  license: 'CC0-1.0',
  title: "Plastic flake silo",
  description: "Plastic flake silo as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "glass plastics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#4a7980", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("plastic-flake-silo");
p.part("tank-foot-left-front", b(-336.0,-313.6,0,100,100,250).color(color));
p.part("tank-foot-right-front", b(336.0,-313.6,0,100,100,250).color(color));
p.part("tank-foot-left-back", b(-336.0,313.6,0,100,100,250).color(color));
p.part("tank-foot-right-back", b(336.0,313.6,0,100,100,250).color(color));
p.part("vessel-shell", c(0,0,220,1490,420.0,12).color(color));
p.part("top-flange", c(0,0,1710,70,451.5,12).color(color));
p.part("roof-cap", c(0,0,1780,160,388.5,12).color(color));
p.part("manway", c(0,0,1940,110,125,10).color(color));
p.part("vent-stack", c(273.0,0,1910,260,42,10).color(color));
p.part("access-ladder", b(451.5,0,220,65,70,1221.8).color(color));
p.part("outlet-pipe", b(357.0,-333.20000000000005,240,180,100,130).color(color));
p.part("drain-valve", c(378.0,-352.8,180,120,42,10).color(color));
p.part("side-nozzle", cy(409.5,294.0,700.3,180,58,10).color(color));
p.part("conical-discharge", c(0,0,100,180,273.0,12).color(color));
p.part("outlet-neck", b(0,0,0,170,170,100).color(color));

return p.model();
