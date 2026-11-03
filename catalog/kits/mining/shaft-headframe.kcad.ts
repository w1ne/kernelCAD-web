// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "shaft-headframe",
  license: 'CC0-1.0',
  title: "Mine shaft headframe",
  description: "Steel-look headframe with paired uprights, winding sheaves, and a raised service deck. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#686d69", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("shaft-headframe");
p.part("base-skid", b(0, 0, 0, 760, 560, 70).color(color));
p.part("tower-left", b(-250, 0, 70, 70, 80, 880).color(color));
p.part("tower-right", b(250, 0, 70, 70, 80, 880).color(color));
p.part("upper-crossbeam", b(0, 0, 900, 650, 100, 85).color(color));
p.part("rear-brace", b(0, 220, 470, 590, 55, 45).color(color));
p.part("sheave-left", hy(-165, 0, 1010, 100, 125, 12).color(color));
p.part("sheave-right", hy(165, 0, 1010, 100, 125, 12).color(color));
p.part("operator-platform", b(0, -110, 720, 720, 250, 45).color(color));

return p.model();
