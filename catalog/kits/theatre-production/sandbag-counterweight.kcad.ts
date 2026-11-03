// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "sandbag-counterweight",
  license: 'CC0-1.0',
  title: "Sandbag counterweight",
  description: "Soft-looking rigging sandbag with central body, folded end caps and hanging loop. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#807563", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("sandbag-counterweight");
p.part("bag-body", b(0,0,0,520,260,260).color(color));
p.part("end-left", b(-260,0,30,55,280,200).color(color));
p.part("end-right", b(260,0,30,55,280,200).color(color));
p.part("top-seam", b(0,0,250,520,280,38).color(color));
p.part("label-patch", b(0,-135,120,180,20,90).color(color));
p.part("hanger-strap-left", b(-130,0,260,55,65,120).color(color));
p.part("hanger-strap-right", b(130,0,260,55,65,120).color(color));
p.part("suspension-eye", c(0,0,350,95,34,10).color(color));

return p.model();
