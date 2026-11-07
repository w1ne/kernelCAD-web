// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "hydrocyclone-cluster",
  license: 'CC0-1.0',
  title: "Hydrocyclone cluster",
  description: "Cyclone manifold with multiple compact separators, feed header, support frame, and underflow collection box. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7f7970", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("hydrocyclone-cluster");
p.part("base-frame", b(0, 0, 0, 1050, 680, 70).color(color));
p.part("header-left", b(-390, 0, 720, 90, 650, 80).color(color));
p.part("header-right", b(390, 0, 720, 90, 650, 80).color(color));
p.part("cyclone-0", c(-250, 0, 250, 470, 78, 8).color(color));
p.part("cyclone-1", c(-125, 0, 250, 470, 78, 8).color(color));
p.part("cyclone-2", c(0, 0, 250, 470, 78, 8).color(color));
p.part("cyclone-3", c(125, 0, 250, 470, 78, 8).color(color));
p.part("cyclone-4", c(250, 0, 250, 470, 78, 8).color(color));
p.part("underflow-box", b(0, 0, 100, 900, 480, 120).color(color));
p.part("crossbeam", b(0, 0, 680, 980, 65, 75).color(color));
p.part("feed-header", c(0, -365, 690, 100, 48, 8).color(color));
p.part("service-platform", b(0, 365, 380, 1000, 140, 45).color(color));

return p.model();
