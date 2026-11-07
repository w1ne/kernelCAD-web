// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "converter-cabinet",
  license: 'CC0-1.0',
  title: "Power converter cabinet",
  description: "Tall converter cabinet with top lip, twin front panels and side cooling louvres. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#707a76", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("converter-cabinet");
p.part("body",b(0,0,0,920,650,1450).color(color));
p.part("top",b(0,0,1450,980,700,60).color(color));
p.part("panel-left",b(-220,-330,80,400,20,1180).color(color));
p.part("panel-right",b(220,-330,80,400,20,1180).color(color));
p.part("louver-0",b(-470,0,200,18,340,90).color(color));
p.part("louver-1",b(-470,0,380,18,340,90).color(color));
p.part("louver-2",b(-470,0,560,18,340,90).color(color));
p.part("louver-3",b(-470,0,740,18,340,90).color(color));
p.part("louver-4",b(-470,0,920,18,340,90).color(color));

return p.model();
