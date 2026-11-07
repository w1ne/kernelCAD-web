// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "rapid-sand-filter",
  license: 'CC0-1.0',
  title: "Rapid sand filter bed",
  description: "Open rectangular rapid filter with raised walls, underdrain header and removable cover beams. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#718079", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("rapid-sand-filter");
p.part("bed",b(0,0,0,1000,760,40).color(color));
p.part("wall-front",b(0,-350,20,1000,60,360).color(color));
p.part("wall-back",b(0,350,20,1000,60,360).color(color));
p.part("wall-left",b(-470,0,20,60,700,360).color(color));
p.part("wall-right",b(470,0,20,60,700,360).color(color));
p.part("media-layer",b(0,0,60,850,620,110).color(color));
p.part("underdrain",c(0,0,0,320,65,10).color(color));
p.part("cover-beam",b(0,0,385,950,55,40).color(color));

return p.model();
