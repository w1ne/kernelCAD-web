// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "metal-detector-arch",
  license: 'CC0-1.0',
  title: "Conveyor metal detector arch",
  description: "Inspection conveyor with detector arch, belt guides, control cabinet, and adjustable sensor head. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6d776f", { label: 'Asset color' });
const baseZ=70;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("metal-detector-arch");
p.part("belt", b(0, 0, 120, 1020, 410, 60).color(color));
p.part("left-leg", b(0, -270, 180, 70, 70, 520).color(color));
p.part("right-leg", b(0, 270, 180, 70, 70, 520).color(color));
p.part("arch-top", b(0, 0, 700, 670, 80, 75).color(color));
p.part("sensor-left", b(0, -300, 450, 80, 70, 470).color(color));
p.part("sensor-right", b(0, 300, 450, 80, 70, 470).color(color));
p.part("control-cabinet", b(-420, -300, 130, 190, 150, 320).color(color));
p.part("signal-head", b(0, 0, 775, 120, 110, 100).color(color));
p.part("tail-roller", hy(-500, 0, 130, 420, 60, 10).color(color));
p.part("head-roller", hy(500, 0, 130, 420, 60, 10).color(color));

return p.model();
