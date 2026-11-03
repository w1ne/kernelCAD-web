// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "stage-extension-wing",
  license: 'CC0-1.0',
  title: "Stage extension wing",
  description: "Side-stage extension platform with a box frame, guard posts and a small tie-in plate. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#737783", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("stage-extension-wing");
p.part("platform", b(0,0,380,1500,920,95).color(color));
p.part("front-apron", b(0,-445,220,1500,55,260).color(color));
p.part("left-rail", b(-710,0,475,55,860,50).color(color));
p.part("right-rail", b(710,0,475,55,860,50).color(color));
p.part("rear-rail", b(0,430,475,1380,55,50).color(color));
p.part("leg-left-front", b(-650,-360,0,65,65,380).color(color));
p.part("leg-right-front", b(650,-360,0,65,65,380).color(color));
p.part("leg-left-back", b(-650,360,0,65,65,380).color(color));
p.part("leg-right-back", b(650,360,0,65,65,380).color(color));
p.part("tie-in-tab", b(750,0,320,150,300,90).color(color));
p.part("level-left", c(-650,-360,0,80,36,10).color(color));
p.part("level-right", c(650,360,0,80,36,10).color(color));

return p.model();
