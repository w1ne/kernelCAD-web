// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "lighting-yoke-bracket",
  license: 'CC0-1.0',
  title: "Lighting yoke bracket",
  description: "U-shaped luminaire yoke with paired side arms, crossbar, pivot bosses and a center clamp stem. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#71757d", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("lighting-yoke-bracket");
p.part("arm-left", b(-200,0,0,45,70,430).color(color));
p.part("arm-right", b(200,0,0,45,70,430).color(color));
p.part("crossbar", b(0,0,410,445,70,55).color(color));
p.part("mount-plate", b(0,0,0,470,280,55).color(color));
p.part("stiffener-left", b(-120,0,60,40,45,320).color(color));
p.part("stiffener-right", b(120,0,60,40,45,320).color(color));
p.part("pivot-left", c(-220,0,300,90,54,10).color(color));
p.part("pivot-right", c(220,0,300,90,54,10).color(color));
p.part("spigot", c(0,0,465,155,42,10).color(color));

return p.model();
