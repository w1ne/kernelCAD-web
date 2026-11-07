// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "magnetic-separator-drum",
  license: 'CC0-1.0',
  title: "Wet magnetic separator",
  description: "Separator frame with feed trough, drum housing, collection launder, and drive block. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#637a75", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("magnetic-separator-drum");
p.part("base-frame", b(0, 0, 0, 1050, 700, 70).color(color));
p.part("side-left", b(-400, 0, 70, 75, 620, 620).color(color));
p.part("side-right", b(400, 0, 70, 75, 620, 620).color(color));
p.part("separator-drum", c(0, 0, 250, 360, 290, 12).color(color));
p.part("feed-trough", b(-120, -330, 410, 620, 130, 95).color(color));
p.part("tailings-launder", b(170, 330, 180, 650, 140, 100).color(color));
p.part("drive-motor", b(460, 0, 160, 230, 270, 270).color(color));
p.part("top-beam", b(0, 0, 650, 900, 85, 70).color(color));
p.part("service-platform", b(0, 390, 350, 950, 140, 45).color(color));

return p.model();
