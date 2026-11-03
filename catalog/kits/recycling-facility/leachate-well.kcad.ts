// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "leachate-well",
  license: 'CC0-1.0',
  title: "Leachate well",
  description: "Leachate well as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6e775d", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("leachate-well");
p.part("surface-pad", b(0,0,0,1140.0,912.0,90).color(color));
p.part("well-casing", c(0,0,90,958.9999999999999,294.5,12).color(color));
p.part("head-collar", c(0,0,1049.0,95,342.0,12).color(color));
p.part("instrument-bridge", b(0,0,1144.0,665.0,95,75).color(color));
p.part("sampling-port", c(285.0,0,160,280,35,10).color(color));
p.part("valve-wheel", c(-266.0,-228.0,170,55,125,10).color(color));
p.part("protective-post-left", b(-465.5,0,0,70,70,500).color(color));
p.part("protective-post-right", b(465.5,0,0,70,70,500).color(color));

return p.model();
