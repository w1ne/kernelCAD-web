// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ore-pass-grizzly",
  license: 'CC0-1.0',
  title: "Ore-pass grizzly gate",
  description: "Heavy inclined-look grizzly panel in a service frame with parallel bars and side drive housings. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#777d73", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("ore-pass-grizzly");
p.part("lower-frame", b(0, 0, 0, 1020, 700, 80).color(color));
p.part("side-left", b(-465, 0, 70, 90, 700, 480).color(color));
p.part("side-right", b(465, 0, 70, 90, 700, 480).color(color));
p.part("grizzly-bar-0", b(-340, 0, 130, 34, 620, 390).color(color));
p.part("grizzly-bar-1", b(-255, 0, 130, 34, 620, 390).color(color));
p.part("grizzly-bar-2", b(-170, 0, 130, 34, 620, 390).color(color));
p.part("grizzly-bar-3", b(-85, 0, 130, 34, 620, 390).color(color));
p.part("grizzly-bar-4", b(0, 0, 130, 34, 620, 390).color(color));
p.part("grizzly-bar-5", b(85, 0, 130, 34, 620, 390).color(color));
p.part("grizzly-bar-6", b(170, 0, 130, 34, 620, 390).color(color));
p.part("grizzly-bar-7", b(255, 0, 130, 34, 620, 390).color(color));
p.part("grizzly-bar-8", b(340, 0, 130, 34, 620, 390).color(color));
p.part("drive-left", c(-500, 0, 120, 180, 90, 8).color(color));
p.part("drive-right", c(500, 0, 120, 180, 90, 8).color(color));
p.part("upper-crossbar", b(0, 0, 500, 1120, 80, 75).color(color));

return p.model();
