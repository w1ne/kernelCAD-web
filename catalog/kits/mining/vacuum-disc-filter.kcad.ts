// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "vacuum-disc-filter",
  license: 'CC0-1.0',
  title: "Vacuum disc filter",
  description: "Dewatering unit with trough, central shaft, filter-disc panels, support bearings, and vacuum header. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#738079", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("vacuum-disc-filter");
p.part("trough", b(0, 0, 0, 1180, 600, 220).color(color));
p.part("left-bearing", b(-430, 0, 220, 145, 670, 320).color(color));
p.part("right-bearing", b(430, 0, 220, 145, 670, 320).color(color));
p.part("filter-shaft", c(0, 0, 380, 100, 65, 10).color(color));
p.part("filter-disc-0", b(-330, 0, 430, 60, 440, 390).color(color));
p.part("filter-disc-1", b(-165, 0, 430, 60, 440, 390).color(color));
p.part("filter-disc-2", b(0, 0, 430, 60, 440, 390).color(color));
p.part("filter-disc-3", b(165, 0, 430, 60, 440, 390).color(color));
p.part("filter-disc-4", b(330, 0, 430, 60, 440, 390).color(color));
p.part("vacuum-header", b(0, -365, 330, 950, 55, 55).color(color));
p.part("drive-motor", b(600, 0, 235, 220, 230, 230).color(color));
p.part("vacuum-receiver", c(0, 390, 100, 350, 120, 10).color(color));

return p.model();
