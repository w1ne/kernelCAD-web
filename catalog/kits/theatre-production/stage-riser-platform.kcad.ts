// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "stage-riser-platform",
  license: 'CC0-1.0',
  title: "Stage riser platform",
  description: "Two-level riser assembly with stepped decks, boxed supports and a low access step. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#696f79", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("stage-riser-platform");
p.part("lower-deck", b(0,0,280,1700,1000,90).color(color));
p.part("upper-deck", b(0,250,570,1700,520,90).color(color));
p.part("lower-front", b(0,-470,190,1700,55,90).color(color));
p.part("upper-front", b(0,-20,480,1700,55,90).color(color));
p.part("support-left-low", b(-750,180,0,70,70,280).color(color));
p.part("support-right-low", b(750,180,0,70,70,280).color(color));
p.part("support-left-high", b(-750,410,0,70,70,570).color(color));
p.part("support-right-high", b(750,410,0,70,70,570).color(color));
p.part("step", b(0,-610,0,540,400,170).color(color));
p.part("cross-rail", b(0,250,210,1600,60,55).color(color));
p.part("foot-left", c(-740,-420,0,90,42,10).color(color));
p.part("foot-right", c(740,-420,0,90,42,10).color(color));

return p.model();
