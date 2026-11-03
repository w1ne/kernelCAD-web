// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "grit-removal-chamber",
  license: 'CC0-1.0',
  title: "Grit removal chamber",
  description: "Rectangular grit chamber with sloped-look hopper base, inlet lip and extraction pipe stand. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#737a78", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("grit-removal-chamber");
p.part("basin-floor",b(0,0,20,1000,760,40).color(color));
p.part("wall-left",b(0,-360,40,1000,40,380).color(color));
p.part("wall-right",b(0,360,40,1000,40,380).color(color));
p.part("end-wall",b(480,0,40,40,760,380).color(color));
p.part("hopper",b(0,0,40,620,480,220).color(color));
p.part("draw-off",c(0,0,0,360,65,10).color(color));
p.part("inlet-lip",b(-500,0,280,80,720,70).color(color));

return p.model();
