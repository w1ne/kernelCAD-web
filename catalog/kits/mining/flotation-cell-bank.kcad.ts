// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "flotation-cell-bank",
  license: 'CC0-1.0',
  title: "Flotation cell bank",
  description: "Three-cell flotation bank with connected tank bodies, central drive housings, and access walkway. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#617b77", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("flotation-cell-bank");
p.part("base-skid", b(0, 0, 0, 1420, 620, 75).color(color));
p.part("cell-0", c(-440, 0, 75, 470, 205, 10).color(color));
p.part("cell-1", c(0, 0, 75, 470, 205, 10).color(color));
p.part("cell-2", c(440, 0, 75, 470, 205, 10).color(color));
p.part("motor-0", b(-440, 0, 545, 150, 150, 185).color(color));
p.part("motor-1", b(0, 0, 545, 150, 150, 185).color(color));
p.part("motor-2", b(440, 0, 545, 150, 150, 185).color(color));
p.part("walkway", b(0, 340, 575, 1410, 150, 55).color(color));
p.part("front-rail", b(0, 420, 635, 1370, 35, 40).color(color));
p.part("launder-left", c(-650, 0, 560, 75, 245, 8).color(color));
p.part("launder-right", c(650, 0, 560, 75, 245, 8).color(color));

return p.model();
