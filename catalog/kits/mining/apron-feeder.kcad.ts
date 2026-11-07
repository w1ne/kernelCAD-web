// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "apron-feeder",
  license: 'CC0-1.0',
  title: "Heavy-duty apron feeder",
  description: "Low feeder with overlapping pan plates, side chains, head sprocket housings, and a feed skirt. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#776c55", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("apron-feeder");
p.part("left-rail", b(0, -310, 0, 1320, 75, 220).color(color));
p.part("right-rail", b(0, 310, 0, 1320, 75, 220).color(color));
p.part("apron-pan-0", b(-500, 0, 115, 118, 555, 45).color(color));
p.part("apron-pan-1", b(-375, 0, 115, 118, 555, 45).color(color));
p.part("apron-pan-2", b(-250, 0, 115, 118, 555, 45).color(color));
p.part("apron-pan-3", b(-125, 0, 115, 118, 555, 45).color(color));
p.part("apron-pan-4", b(0, 0, 115, 118, 555, 45).color(color));
p.part("apron-pan-5", b(125, 0, 115, 118, 555, 45).color(color));
p.part("apron-pan-6", b(250, 0, 115, 118, 555, 45).color(color));
p.part("apron-pan-7", b(375, 0, 115, 118, 555, 45).color(color));
p.part("apron-pan-8", b(500, 0, 115, 118, 555, 45).color(color));
p.part("head-sprocket-left", hy(570, -310, 150, 115, 125, 8).color(color));
p.part("head-sprocket-right", hy(570, 310, 150, 115, 125, 8).color(color));
p.part("feed-skirt-left", b(-350, -360, 260, 500, 45, 360).color(color));
p.part("feed-skirt-right", b(-350, 360, 260, 500, 45, 360).color(color));
p.part("drive-motor", b(650, 0, 95, 250, 230, 180).color(color));

return p.model();
