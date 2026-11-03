// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "circular-clarifier",
  license: 'CC0-1.0',
  title: "Circular clarifier tank",
  description: "Circular clarifier with wide rim, central feed well, bridge beam and scraper drive housing. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#73807d", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("circular-clarifier");
p.part("tank",c(0,0,0,430,520,16).color(color));
p.part("rim",c(0,0,420,70,560,16).color(color));
p.part("feed-well",c(0,0,470,220,165,12).color(color));
p.part("bridge",b(0,0,500,1000,65,55).color(color));
p.part("drive",b(0,0,555,230,180,100).color(color));
p.part("walkway",b(0,250,475,560,110,45).color(color));

return p.model();
