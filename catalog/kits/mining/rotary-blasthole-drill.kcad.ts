// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "rotary-blasthole-drill",
  license: 'CC0-1.0',
  title: "Rotary blasthole drill rig",
  description: "Surface drill rig with crawler base, elevated deck, tall feed mast, drill string, and operator cabin. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d49a38", { label: 'Asset color' });
const baseZ=35;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("rotary-blasthole-drill");
p.part("left-crawler", b(-80, -300, 35, 1050, 175, 105).color(color));
p.part("right-crawler", b(-80, 300, 35, 1050, 175, 105).color(color));
p.part("main-deck", b(-50, 0, 150, 920, 580, 170).color(color));
p.part("operator-cab", b(-330, 145, 320, 300, 260, 360).color(color));
p.part("cab-roof", b(-330, 145, 680, 340, 300, 50).color(color));
p.part("drill-mast", b(300, 0, 300, 185, 220, 1250).color(color));
p.part("drill-string", c(300, 0, 60, 300, 50, 8).color(color));
p.part("hose-rack", b(40, -280, 325, 280, 80, 270).color(color));

return p.model();
