// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "overland-conveyor-bridge",
  license: 'CC0-1.0',
  title: "Overland conveyor bridge",
  description: "Elevated conveyor gallery with long belt trough, portal supports, and crossed structural braces. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#737b70", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("overland-conveyor-bridge");
p.part("belt", b(0, 0, 490, 1800, 270, 70).color(color));
p.part("left-stringer", b(0, -150, 430, 1800, 55, 90).color(color));
p.part("right-stringer", b(0, 150, 430, 1800, 55, 90).color(color));
p.part("portal-leg--610--190", b(-610, -190, 0, 70, 70, 430).color(color));
p.part("portal-leg--610-190", b(-610, 190, 0, 70, 70, 430).color(color));
p.part("portal-leg-610--190", b(610, -190, 0, 70, 70, 430).color(color));
p.part("portal-leg-610-190", b(610, 190, 0, 70, 70, 430).color(color));
p.part("portal-top-left", b(-610, 0, 420, 80, 430, 70).color(color));
p.part("portal-top-right", b(610, 0, 420, 80, 430, 70).color(color));
p.part("cross-brace-front", b(0, -180, 180, 1180, 40, 40).color(color));
p.part("cross-brace-back", b(0, 180, 180, 1180, 40, 40).color(color));
p.part("idler-left", hy(-600, 0, 455, 320, 55, 10).color(color));
p.part("idler-right", hy(600, 0, 455, 320, 55, 10).color(color));

return p.model();
