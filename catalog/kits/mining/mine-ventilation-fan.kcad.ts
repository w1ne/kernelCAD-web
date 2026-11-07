// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mine-ventilation-fan",
  license: 'CC0-1.0',
  title: "Mine ventilation fan station",
  description: "Compact fan station with intake plenum, motor block, guarded housing, and raised support frame. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#638078", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("mine-ventilation-fan");
p.part("base-skid", b(0, 0, 0, 850, 550, 60).color(color));
p.part("left-support", b(-290, 0, 60, 70, 500, 280).color(color));
p.part("right-support", b(290, 0, 60, 70, 500, 280).color(color));
p.part("fan-housing", c(0, 0, 180, 360, 245, 12).color(color));
p.part("inlet-ring", c(0, 0, 540, 65, 285, 12).color(color));
p.part("motor", b(-390, 0, 140, 240, 260, 230).color(color));
p.part("outlet-plenum", b(0, 0, 545, 540, 540, 100).color(color));
p.part("service-platform", b(0, -355, 280, 800, 110, 45).color(color));

return p.model();
