// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "continuous-miner",
  license: 'CC0-1.0',
  title: "Continuous miner",
  description: "Low tracked mining machine with cutting head, operator canopy, cutter drum, and trailing cable reel. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#c19b42", { label: 'Asset color' });
const baseZ=35;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("continuous-miner");
p.part("left-track", b(-90, -245, 35, 950, 145, 95).color(color));
p.part("right-track", b(-90, 245, 35, 950, 145, 95).color(color));
p.part("main-body", b(-90, 0, 130, 700, 360, 190).color(color));
p.part("operator-canopy", b(175, 0, 330, 360, 360, 55).color(color));
p.part("cutting-drum", hy(440, 0, 225, 350, 155, 12).color(color));
p.part("cutter-boom", b(330, 0, 190, 330, 160, 110).color(color));
p.part("cable-reel", c(-450, 0, 180, 100, 125, 10).color(color));
p.part("rear-control-box", b(-460, 0, 165, 160, 280, 210).color(color));

return p.model();
