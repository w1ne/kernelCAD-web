// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ore-sorting-arch",
  license: 'CC0-1.0',
  title: "Ore sorting sensor arch",
  description: "Conveyor inspection arch with sensor heads, side cabinets, belt, and an overhead scanning bar. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#62736e", { label: 'Asset color' });
const baseZ=125;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("ore-sorting-arch");
p.part("belt", b(0, 0, 125, 1100, 420, 60).color(color));
p.part("left-leg", b(0, -280, 185, 75, 75, 610).color(color));
p.part("right-leg", b(0, 280, 185, 75, 75, 610).color(color));
p.part("crossbar", b(0, 0, 760, 700, 90, 85).color(color));
p.part("sensor-left", b(-170, 0, 630, 150, 190, 130).color(color));
p.part("sensor-right", b(170, 0, 630, 150, 190, 130).color(color));
p.part("control-cabinet", b(-490, -300, 130, 190, 160, 350).color(color));
p.part("guard-left", b(0, -250, 130, 980, 35, 95).color(color));
p.part("guard-right", b(0, 250, 130, 980, 35, 95).color(color));
p.part("scan-beacon", c(0, 0, 845, 75, 45, 8).color(color));

return p.model();
