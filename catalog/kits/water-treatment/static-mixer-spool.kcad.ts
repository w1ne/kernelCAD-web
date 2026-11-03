// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "static-mixer-spool",
  license: 'CC0-1.0',
  title: "Static mixer pipe spool",
  description: "Short process spool with two flanged ends and a protective central mixer housing. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#727a75", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("static-mixer-spool");
p.part("pipe",c(0,0,0,720,100,12).color(color));
p.part("flange-low",c(0,0,0,35,160,12).color(color));
p.part("flange-high",c(0,0,685,35,160,12).color(color));
p.part("mixer-housing",b(0,0,290,220,220,170).color(color));
p.part("access-cover",b(0,-120,330,120,25,90).color(color));

return p.model();
