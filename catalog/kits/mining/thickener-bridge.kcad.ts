// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "thickener-bridge",
  license: 'CC0-1.0',
  title: "Tailings thickener bridge",
  description: "Circular thickener tank with peripheral rim, radial bridge, central drive, and rake-arm crossbar. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6a7872", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("thickener-bridge");
p.part("tank", c(0, 0, 0, 170, 620, 16).color(color));
p.part("tank-rim", c(0, 0, 150, 60, 650, 16).color(color));
p.part("bridge", b(0, 0, 210, 1200, 70, 65).color(color));
p.part("bridge-rail-left", b(0, -85, 275, 1100, 25, 55).color(color));
p.part("bridge-rail-right", b(0, 85, 275, 1100, 25, 55).color(color));
p.part("center-drive", c(0, 0, 210, 200, 155, 12).color(color));
p.part("drive-cover", b(0, 0, 410, 260, 220, 130).color(color));
p.part("rake-arm-left", b(-220, 0, 80, 450, 35, 35).color(color));
p.part("rake-arm-right", b(220, 0, 80, 450, 35, 35).color(color));
p.part("walkway", b(0, -560, 210, 300, 120, 45).color(color));

return p.model();
