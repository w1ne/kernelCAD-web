// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "litter-fence-panel",
  license: 'CC0-1.0',
  title: "Litter fence panel",
  description: "Litter fence panel as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
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

const p = assembly("litter-fence-panel");
p.part("bottom-rail", b(0,0,80,1000,80,80).color(color));
p.part("top-rail", b(0,0,1290,1000,80,80).color(color));
p.part("left-post", b(-480.0,0,0,90,90,1370).color(color));
p.part("right-post", b(480.0,0,0,90,90,1370).color(color));
p.part("mesh-bar-1", b(-360.0,0,120,35,45,1130).color(color));
p.part("mesh-bar-2", b(-120.0,0,120,35,45,1130).color(color));
p.part("mesh-bar-3", b(120.0,0,120,35,45,1130).color(color));
p.part("mesh-bar-4", b(360.0,0,120,35,45,1130).color(color));
p.part("foot-left", b(-480.0,0,0,180,260,100).color(color));
p.part("foot-right", b(480.0,0,0,180,260,100).color(color));

return p.model();
