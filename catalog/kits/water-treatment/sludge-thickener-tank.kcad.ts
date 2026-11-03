// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "sludge-thickener-tank",
  license: 'CC0-1.0',
  title: "Sludge thickener tank",
  description: "Circular thickener tank with deep skirt, center feed well, bridge beam and scraper arm. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6f7770", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("sludge-thickener-tank");
p.part("tank",c(0,0,0,480,500,16).color(color));
p.part("rim",c(0,0,460,60,535,16).color(color));
p.part("feed-well",c(0,0,520,220,150,12).color(color));
p.part("bridge",b(0,0,555,990,60,50).color(color));
p.part("drive",b(0,0,605,190,160,110).color(color));
p.part("scraper-arm",b(0,0,230,760,45,45).color(color));
p.part("skirt",c(0,0,0,160,520,16).color(color));

return p.model();
