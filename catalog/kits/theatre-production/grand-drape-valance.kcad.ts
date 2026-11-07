// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "grand-drape-valance",
  license: 'CC0-1.0',
  title: "Grand drape valance",
  description: "Gathered-looking theatre valance panel with upper rail, hanging tabs and weighted lower seam. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#684c5a", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("grand-drape-valance");
p.part("valance", b(0,0,0,2600,130,620).color(color));
p.part("top-rail", b(0,0,620,2660,160,65).color(color));
p.part("gather-panel-left", b(-820,-80,30,720,95,500).color(color));
p.part("gather-panel-center", b(0,-80,30,720,95,500).color(color));
p.part("gather-panel-right", b(820,-80,30,720,95,500).color(color));
p.part("hem", b(0,0,0,2600,150,75).color(color));
p.part("hanger-left", b(-1000,0,685,80,100,70).color(color));
p.part("hanger-center", b(0,0,685,80,100,70).color(color));
p.part("hanger-right", b(1000,0,685,80,100,70).color(color));
p.part("eyelet-left", c(-1000,0,720,55,22,10).color(color));
p.part("eyelet-right", c(1000,0,720,55,22,10).color(color));

return p.model();
