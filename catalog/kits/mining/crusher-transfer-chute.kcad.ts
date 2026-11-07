// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "crusher-transfer-chute",
  license: 'CC0-1.0',
  title: "Crusher transfer chute",
  description: "Enclosed transfer chute with upper feed throat, lower discharge neck, support legs, and inspection cover. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#716f64", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("crusher-transfer-chute");
p.part("top-flange", b(0, 0, 640, 760, 600, 65).color(color));
p.part("front-wall", b(0, -250, 340, 720, 55, 560).color(color));
p.part("back-wall", b(0, 250, 340, 720, 55, 560).color(color));
p.part("left-wall", b(-330, 0, 340, 55, 450, 560).color(color));
p.part("right-wall", b(330, 0, 340, 55, 450, 560).color(color));
p.part("discharge-neck", b(0, 0, 80, 330, 330, 260).color(color));
p.part("inspection-cover", b(0, -290, 445, 250, 35, 180).color(color));
p.part("leg-left", b(-360, -260, 0, 65, 65, 280).color(color));
p.part("leg-right", b(360, 260, 0, 65, 65, 280).color(color));
p.part("access-boss", c(0, -320, 500, 70, 70, 8).color(color));

return p.model();
