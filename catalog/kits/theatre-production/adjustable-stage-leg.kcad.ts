// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "adjustable-stage-leg",
  license: 'CC0-1.0',
  title: "Adjustable stage leg",
  description: "Telescoping stage support with a broad floor plate, outer sleeve, adjustment collar and cap pad. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#747980", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("adjustable-stage-leg");
p.part("floor-plate", b(0,0,0,360,360,55).color(color));
p.part("sleeve", b(0,0,55,135,135,560).color(color));
p.part("inner-post", b(0,0,615,82,82,300).color(color));
p.part("deck-cap", b(0,0,915,220,220,45).color(color));
p.part("pin-tab", b(78,0,510,75,50,95).color(color));
p.part("collar", c(0,0,550,75,92,10).color(color));
p.part("locking-pin", c(0,-90,480,55,19,10).color(color));
p.part("level-foot", c(0,0,0,44,110,10).color(color));

return p.model();
