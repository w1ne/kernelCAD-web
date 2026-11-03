// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "landfill-gas-wellhead",
  license: 'CC0-1.0',
  title: "Landfill gas wellhead",
  description: "Landfill gas wellhead as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5c6c7b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("landfill-gas-wellhead");
p.part("surface-pad", b(0,0,0,1260.0,912.0,90).color(color));
p.part("well-casing", c(0,0,90,1127.0,325.5,12).color(color));
p.part("head-collar", c(0,0,1217.0,95,378.0,12).color(color));
p.part("instrument-bridge", b(0,0,1312.0,735.0,95,75).color(color));
p.part("sampling-port", c(315.0,0,160,280,35,10).color(color));
p.part("valve-wheel", c(-294.0,-228.0,170,55,125,10).color(color));
p.part("protective-post-left", b(-514.5,0,0,70,70,500).color(color));
p.part("protective-post-right", b(514.5,0,0,70,70,500).color(color));

return p.model();
