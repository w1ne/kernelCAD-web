// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "tipping-floor-bin",
  license: 'CC0-1.0',
  title: "Tipping-floor bin",
  description: "Tipping-floor bin as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
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

const p = assembly("tipping-floor-bin");
p.part("tipping-base", b(0,0,0,1180,900,100).color(color));
p.part("hopper-front", b(0,-390.0,100,1180,120,1090).color(color));
p.part("hopper-back", b(0,395.0,100,1180,110,1090).color(color));
p.part("hopper-left", b(-530.0,0,100,120,750,1090).color(color));
p.part("hopper-right", b(530.0,0,100,120,750,1090).color(color));
p.part("front-lip", b(0,-470.0,1200,1210,75,75).color(color));
p.part("pivot-left", c(-635.0,0,160,180,65,10).color(color));
p.part("pivot-right", c(635.0,0,160,180,65,10).color(color));
p.part("fork-pocket-left", b(-393.3333333333333,0,0,110,648.0,90).color(color));
p.part("fork-pocket-right", b(393.3333333333333,0,0,110,648.0,90).color(color));

return p.model();
