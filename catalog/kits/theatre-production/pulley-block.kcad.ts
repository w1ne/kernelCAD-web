// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "pulley-block",
  license: 'CC0-1.0',
  title: "Pulley block",
  description: "Single-sheave block with side cheeks, top attachment eye and lower rope slot. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#77777a", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("pulley-block");
p.part("cheek-left", b(-95,0,0,45,130,280).color(color));
p.part("cheek-right", b(95,0,0,45,130,280).color(color));
p.part("top-crossbar", b(0,0,250,200,130,55).color(color));
p.part("bottom-crossbar", b(0,0,0,200,130,55).color(color));
p.part("rope-slot-left", b(-70,-70,25,60,28,120).color(color));
p.part("rope-slot-right", b(70,-70,25,60,28,120).color(color));
p.part("sheave", c(0,0,65,165,95,10).color(color));
p.part("axle", c(0,0,0,260,28,10).color(color));
p.part("attachment-eye", c(0,0,305,95,48,10).color(color));

return p.model();
