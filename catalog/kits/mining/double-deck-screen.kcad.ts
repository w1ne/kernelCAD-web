// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "double-deck-screen",
  license: 'CC0-1.0',
  title: "Double-deck vibrating screen",
  description: "Two-level screening unit with framed decks, support springs, discharge lips, and paired exciters. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6c7975", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("double-deck-screen");
p.part("base-frame", b(0, 0, 0, 1320, 780, 65).color(color));
p.part("deck-lower", b(0, 0, 330, 1260, 700, 75).color(color));
p.part("deck-upper", b(0, 0, 690, 1260, 700, 75).color(color));
p.part("side-left", b(0, -360, 150, 1280, 65, 720).color(color));
p.part("side-right", b(0, 360, 150, 1280, 65, 720).color(color));
p.part("discharge-lower", b(650, 0, 285, 220, 750, 75).color(color));
p.part("discharge-upper", b(650, 0, 645, 220, 750, 75).color(color));
p.part("exciter-left", c(0, -410, 500, 140, 95, 8).color(color));
p.part("exciter-right", c(0, 410, 500, 140, 95, 8).color(color));

return p.model();
