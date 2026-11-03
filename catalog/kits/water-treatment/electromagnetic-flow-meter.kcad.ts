// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "electromagnetic-flow-meter",
  license: 'CC0-1.0',
  title: "Electromagnetic flow meter",
  description: "Inline flow meter with a short pipe body, twin flanges and compact electronics head. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6e7772", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("electromagnetic-flow-meter");
p.part("body",c(0,0,40,620,145,12).color(color));
p.part("flange-low",c(0,0,0,40,185,12).color(color));
p.part("flange-high",c(0,0,660,40,185,12).color(color));
p.part("electronics-head",b(0,0,720,240,180,170).color(color));
p.part("display",b(0,-95,760,135,18,65).color(color));

return p.model();
