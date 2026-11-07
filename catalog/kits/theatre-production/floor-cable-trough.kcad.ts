// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "floor-cable-trough",
  license: 'CC0-1.0',
  title: "Floor cable trough",
  description: "Open-top cable trough section with removable lid strips, sidewalls and joining flanges. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#696e77", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("floor-cable-trough");
p.part("floor", b(0,0,0,1500,360,45).color(color));
p.part("wall-left", b(0,-160,45,1500,40,180).color(color));
p.part("wall-right", b(0,160,45,1500,40,180).color(color));
p.part("lid-left", b(0,-88,225,730,100,38).color(color));
p.part("lid-right", b(0,88,225,730,100,38).color(color));
p.part("splice-plate-left", b(-760,0,0,60,400,230).color(color));
p.part("splice-plate-right", b(760,0,0,60,400,230).color(color));
p.part("support-crossbar", b(0,0,110,1450,50,45).color(color));
p.part("join-pin-left", c(-730,0,0,75,22,10).color(color));
p.part("join-pin-right", c(730,0,0,75,22,10).color(color));

return p.model();
