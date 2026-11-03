// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "core-drill-rig",
  license: 'CC0-1.0',
  title: "Exploration core drill rig",
  description: "Portable exploration drill with anchor frame, mast, crown block, rod rack, and control cabinet. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#87917e", { label: 'Asset color' });
const baseZ=20;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("core-drill-rig");
p.part("base-frame", b(0, 0, 20, 780, 640, 80).color(color));
p.part("left-upright", b(-260, 0, 100, 70, 90, 950).color(color));
p.part("right-upright", b(260, 0, 100, 70, 90, 950).color(color));
p.part("crosshead", b(0, 0, 930, 620, 130, 80).color(color));
p.part("drill-spindle", c(0, 0, 230, 640, 115, 10).color(color));
p.part("control-cabinet", b(-420, 0, 100, 180, 280, 360).color(color));
p.part("rod-rack", b(420, 0, 90, 150, 310, 580).color(color));
p.part("hydraulic-pack", c(0, -260, 100, 220, 105, 10).color(color));

return p.model();
