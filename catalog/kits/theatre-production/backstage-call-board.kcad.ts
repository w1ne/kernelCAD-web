// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "backstage-call-board",
  license: 'CC0-1.0',
  title: "Backstage call board",
  description: "Freestanding call-time board with a broad display panel, marker ledge and weighted feet. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#666e78", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("backstage-call-board");
p.part("panel", b(0,0,850,1050,90,760).color(color));
p.part("header-strip", b(0,-10,1510,1050,100,100).color(color));
p.part("left-post", b(-430,0,120,55,55,720).color(color));
p.part("right-post", b(430,0,120,55,55,720).color(color));
p.part("marker-ledge", b(0,-95,780,1000,150,55).color(color));
p.part("base-left", b(-430,0,0,240,300,120).color(color));
p.part("base-right", b(430,0,0,240,300,120).color(color));
p.part("row-line-one", b(0,-55,1260,820,28,28).color(color));
p.part("row-line-two", b(0,-55,1120,820,28,28).color(color));
p.part("row-line-three", b(0,-55,980,820,28,28).color(color));
p.part("magnet-left", c(-340,-65,1260,55,24,10).color(color));
p.part("magnet-right", c(340,-65,1120,55,24,10).color(color));

return p.model();
