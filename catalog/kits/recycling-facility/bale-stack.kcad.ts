// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "bale-stack",
  license: 'CC0-1.0',
  title: "Recovered-material bale stack",
  description: "Recovered-material bale stack as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7d6752", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("bale-stack");
p.part("bale-1", b(-370,-260,0,700,500,420).color(color));
p.part("binding-band-1", b(-370,-513,120,710,28,42).color(color));
p.part("bale-2", b(370,-260,0,700,500,420).color(color));
p.part("binding-band-2", b(370,-513,120,710,28,42).color(color));
p.part("bale-3", b(-370,260,0,700,500,420).color(color));
p.part("binding-band-3", b(-370,7,120,710,28,42).color(color));
p.part("bale-4", b(370,260,0,700,500,420).color(color));
p.part("binding-band-4", b(370,7,120,710,28,42).color(color));
p.part("bale-5", b(-370,0,420,700,500,420).color(color));
p.part("binding-band-5", b(-370,-253,540,710,28,42).color(color));
p.part("bale-6", b(370,0,420,700,500,420).color(color));
p.part("binding-band-6", b(370,-253,540,710,28,42).color(color));

return p.model();
