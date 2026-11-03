// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "high-pressure-grinding-rolls",
  license: 'CC0-1.0',
  title: "High-pressure grinding rolls",
  description: "Roll press with paired compression rolls, rigid side frames, feed hopper, and hydraulic drive blocks. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6a7771", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("high-pressure-grinding-rolls");
p.part("base-frame", b(0, 0, 0, 1060, 760, 90).color(color));
p.part("left-frame", b(-390, 0, 90, 120, 620, 750).color(color));
p.part("right-frame", b(390, 0, 90, 120, 620, 750).color(color));
p.part("roll-left", hy(-150, 0, 465, 590, 215, 12).color(color));
p.part("roll-right", hy(150, 0, 465, 590, 215, 12).color(color));
p.part("feed-hopper", b(0, 0, 760, 650, 570, 180).color(color));
p.part("hydraulic-left", b(0, -360, 630, 190, 110, 110).color(color));
p.part("hydraulic-right", b(0, 360, 630, 190, 110, 110).color(color));
p.part("drive-left", b(-550, 0, 120, 170, 400, 320).color(color));
p.part("drive-right", b(550, 0, 120, 170, 400, 320).color(color));

return p.model();
