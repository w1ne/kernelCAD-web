// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "folding-stage-ramp",
  license: 'CC0-1.0',
  title: "Folding stage ramp",
  description: "Portable inclined-access blockout with a broad tread surface, side rails and hinge-like end drums. Stylized scene geometry. Knobs: overall scale and asset color.",
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

const p = assembly("folding-stage-ramp");
p.part("ramp-surface", b(0,0,160,1300,900,90).color(color));
p.part("left-side-rail", b(-620,0,120,55,850,340).color(color));
p.part("right-side-rail", b(620,0,120,55,850,340).color(color));
p.part("anti-slip-rib-a", b(0,-300,245,1150,35,25).color(color));
p.part("anti-slip-rib-b", b(0,0,245,1150,35,25).color(color));
p.part("anti-slip-rib-c", b(0,300,245,1150,35,25).color(color));
p.part("top-hinge-plate", b(0,430,140,760,90,130).color(color));
p.part("lower-stop", b(0,-455,0,1300,70,80).color(color));
p.part("hinge-left", c(-400,430,80,160,45,10).color(color));
p.part("hinge-right", c(400,430,80,160,45,10).color(color));

return p.model();
