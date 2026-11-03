// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "orchestra-pit-filler",
  license: 'CC0-1.0',
  title: "Orchestra pit filler",
  description: "Removable pit-cover module with edge rails, underframe and two recessed handling grips. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#676e78", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("orchestra-pit-filler");
p.part("deck", b(0,0,320,1600,1000,95).color(color));
p.part("front-edge", b(0,-480,270,1600,48,70).color(color));
p.part("back-edge", b(0,480,270,1600,48,70).color(color));
p.part("support-rail-left", b(-650,0,150,65,900,60).color(color));
p.part("support-rail-right", b(650,0,150,65,900,60).color(color));
p.part("grip-left", b(-540,-505,340,170,20,48).color(color));
p.part("grip-right", b(540,-505,340,170,20,48).color(color));
p.part("stiffener-front", b(0,-340,165,1450,45,55).color(color));
p.part("stiffener-back", b(0,340,165,1450,45,55).color(color));
p.part("pin-left", c(-740,0,0,180,34,10).color(color));
p.part("pin-right", c(740,0,0,180,34,10).color(color));

return p.model();
