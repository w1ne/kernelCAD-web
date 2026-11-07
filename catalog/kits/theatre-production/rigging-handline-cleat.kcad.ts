// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "rigging-handline-cleat",
  license: 'CC0-1.0',
  title: "Rigging handline cleat",
  description: "Wall-mounted handline cleat panel with twin rope posts, fairlead and a lower locking bar. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#71737b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("rigging-handline-cleat");
p.part("backplate", b(0,0,0,380,90,620).color(color));
p.part("top-cap", b(0,0,620,420,130,55).color(color));
p.part("left-cheek", b(-170,0,80,50,140,490).color(color));
p.part("right-cheek", b(170,0,80,50,140,490).color(color));
p.part("locking-bar", b(0,-70,210,320,45,55).color(color));
p.part("rope-guide", b(0,0,540,280,80,65).color(color));
p.part("cleat-post-left", c(-100,-30,115,285,36,10).color(color));
p.part("cleat-post-right", c(100,-30,115,285,36,10).color(color));
p.part("fairlead", c(0,-55,520,120,60,10).color(color));

return p.model();
