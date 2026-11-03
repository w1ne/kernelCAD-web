// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "assay-sample-divider",
  license: 'CC0-1.0',
  title: "Assay sample divider",
  description: "Bench sample divider with feed hopper, splitting chute, collection bins, and compact drive enclosure. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#847a62", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("assay-sample-divider");
p.part("base", b(0, 0, 0, 740, 520, 70).color(color));
p.part("left-bin", b(-210, -120, 70, 280, 220, 230).color(color));
p.part("right-bin", b(210, -120, 70, 280, 220, 230).color(color));
p.part("support-post-left", b(-255, 0, 300, 65, 65, 300).color(color));
p.part("support-post-right", b(255, 0, 300, 65, 65, 300).color(color));
p.part("splitter-housing", b(0, 0, 365, 380, 300, 160).color(color));
p.part("feed-hopper", b(0, 0, 525, 300, 240, 240).color(color));
p.part("rotary-splitter", c(0, 0, 290, 75, 145, 10).color(color));
p.part("drive-box", b(0, 225, 190, 170, 130, 210).color(color));
p.part("collection-lip", b(0, -260, 90, 550, 45, 55).color(color));

return p.model();
