// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ball-mill",
  license: 'CC0-1.0',
  title: "Ball mill assembly",
  description: "Mill assembly with compact drum shell, trunnion ends, bearing saddles, motor bed, and feed chute. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6d7670", { label: 'Asset color' });
const baseZ=80;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z-baseZ).scale(scale);

const p=assembly("ball-mill");
p.part("shell", hx(0, 0, 455, 920, 225, 12).color(color));
p.part("feed-trunnion", hx(-510, 0, 455, 220, 115, 10).color(color));
p.part("discharge-trunnion", hx(510, 0, 455, 220, 115, 10).color(color));
p.part("bearing-left", b(-360, 0, 90, 180, 650, 190).color(color));
p.part("bearing-right", b(360, 0, 90, 180, 650, 190).color(color));
p.part("girth-ring", hx(120, 0, 455, 90, 280, 12).color(color));
p.part("motor", b(0, -440, 90, 330, 230, 250).color(color));
p.part("feed-chute", b(-680, 0, 250, 230, 290, 180).color(color));
p.part("discharge-box", b(680, 0, 80, 220, 620, 180).color(color));

return p.model();
