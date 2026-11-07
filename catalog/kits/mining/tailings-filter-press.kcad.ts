// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "tailings-filter-press",
  license: 'CC0-1.0',
  title: "Tailings filter press",
  description: "Plate-and-frame filter press with paired end frames, stacked filter plates, hydraulic ram, and drip tray. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#747970", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("tailings-filter-press");
p.part("base-rail-left", b(0, -260, 0, 1250, 75, 90).color(color));
p.part("base-rail-right", b(0, 260, 0, 1250, 75, 90).color(color));
p.part("fixed-head", b(-560, 0, 90, 90, 600, 750).color(color));
p.part("moving-head", b(560, 0, 90, 90, 600, 750).color(color));
p.part("filter-plate-0", b(-420, 0, 145, 35, 480, 610).color(color));
p.part("filter-plate-1", b(-335, 0, 145, 35, 480, 610).color(color));
p.part("filter-plate-2", b(-250, 0, 145, 35, 480, 610).color(color));
p.part("filter-plate-3", b(-165, 0, 145, 35, 480, 610).color(color));
p.part("filter-plate-4", b(-80, 0, 145, 35, 480, 610).color(color));
p.part("filter-plate-5", b(5, 0, 145, 35, 480, 610).color(color));
p.part("filter-plate-6", b(90, 0, 145, 35, 480, 610).color(color));
p.part("filter-plate-7", b(175, 0, 145, 35, 480, 610).color(color));
p.part("filter-plate-8", b(260, 0, 145, 35, 480, 610).color(color));
p.part("hydraulic-ram", c(640, 0, 385, 170, 95, 10).color(color));
p.part("drip-tray", b(0, 0, 100, 1060, 550, 45).color(color));
p.part("upper-beam", b(0, 0, 820, 1200, 100, 75).color(color));
p.part("control-pedestal", b(-650, -350, 0, 150, 140, 380).color(color));

return p.model();
