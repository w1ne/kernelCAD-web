// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "public-dropoff-canopy",
  license: 'CC0-1.0',
  title: "Public drop-off canopy",
  description: "Public drop-off canopy as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7b6f56", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("public-dropoff-canopy");
p.part("roof-slab", b(0,0,1270,1522.5,1134.0,110).color(color));
p.part("roof-fascia-front", b(0,-571.2,1160,1522.5,70,180).color(color));
p.part("roof-fascia-back", b(0,571.2,1160,1522.5,70,180).color(color));
p.part("post-left-front", b(-609.0,-453.6,0,110,110,1160).color(color));
p.part("post-right-front", b(609.0,-453.6,0,110,110,1160).color(color));
p.part("post-left-back", b(-609.0,453.6,0,110,110,1160).color(color));
p.part("post-right-back", b(609.0,453.6,0,110,110,1160).color(color));
p.part("roof-drain", c(703.5,520.8,0,1270,28,10).color(color));

return p.model();
