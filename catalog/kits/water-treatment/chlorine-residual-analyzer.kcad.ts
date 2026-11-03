// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "chlorine-residual-analyzer",
  license: 'CC0-1.0',
  title: "Residual chlorine analyzer",
  description: "Instrument stand with analyzer head, sample cabinet, status panel and inlet tubing. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d1d1c6", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("chlorine-residual-analyzer");
p.part("base",b(0,0,0,500,360,50).color(color));
p.part("cabinet",b(0,0,285,400,260,520).color(color));
p.part("head",b(0,0,665,360,230,210).color(color));
p.part("display",b(0,-120,695,190,18,90).color(color));
p.part("sample-line",c(150,0,65,410,24,10).color(color));
p.part("support-post",b(0,0,25,45,45,240).color(color));

return p.model();
