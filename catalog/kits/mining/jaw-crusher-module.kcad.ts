// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "jaw-crusher-module",
  license: 'CC0-1.0',
  title: "Jaw crusher module",
  description: "Primary jaw crusher on a skid with feed throat, paired jaw blocks, flywheel housings, and drive motor. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6e7770", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("jaw-crusher-module");
p.part("base-skid", b(0, 0, 0, 1100, 620, 90).color(color));
p.part("frame-left", b(-370, 0, 90, 105, 500, 700).color(color));
p.part("frame-right", b(370, 0, 90, 105, 500, 700).color(color));
p.part("feed-wall-front", b(0, -250, 700, 790, 55, 260).color(color));
p.part("feed-wall-back", b(0, 250, 700, 790, 55, 260).color(color));
p.part("feed-wall-left", b(-365, 0, 700, 60, 445, 260).color(color));
p.part("feed-wall-right", b(365, 0, 700, 60, 445, 260).color(color));
p.part("fixed-jaw", b(-120, 0, 180, 100, 410, 450).color(color));
p.part("swing-jaw", b(100, 0, 180, 95, 410, 400).color(color));
p.part("flywheel-left", hy(-505, 0, 355, 105, 160, 10).color(color));
p.part("flywheel-right", hy(505, 0, 355, 105, 160, 10).color(color));
p.part("drive-motor", b(0, -400, 100, 360, 190, 190).color(color));

return p.model();
