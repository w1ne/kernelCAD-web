// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "sag-mill",
  license: 'CC0-1.0',
  title: "SAG grinding mill",
  description: "Large grinding-mill shell on support piers with trunnion housings, girth drive ring, and feed end. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#72756d", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z-baseZ).scale(scale);

const p=assembly("sag-mill");
p.part("shell", hx(0, 0, 520, 1120, 260, 12).color(color));
p.part("feed-trunnion", hx(-610, 0, 520, 240, 135, 12).color(color));
p.part("discharge-trunnion", hx(610, 0, 520, 240, 135, 12).color(color));
p.part("pier-left", b(-370, 0, 0, 180, 660, 280).color(color));
p.part("pier-right", b(370, 0, 0, 180, 660, 280).color(color));
p.part("girth-drive", hx(170, 0, 520, 100, 315, 12).color(color));
p.part("motor-left", b(0, -450, 90, 320, 240, 260).color(color));
p.part("feed-chute", b(-760, 0, 390, 260, 300, 220).color(color));
p.part("discharge-launder", b(760, 0, 190, 250, 680, 150).color(color));

return p.model();
