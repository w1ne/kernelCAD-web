// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "grizzly-scalping-deck",
  license: 'CC0-1.0',
  title: "Grizzly scalping deck",
  description: "Scalping screen with replaceable parallel bars, reinforced side rails, and shaker drive blocks. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#777c73", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("grizzly-scalping-deck");
p.part("lower-frame", b(0, 0, 0, 1220, 780, 75).color(color));
p.part("side-left", b(0, -360, 70, 1220, 75, 140).color(color));
p.part("side-right", b(0, 360, 70, 1220, 75, 140).color(color));
p.part("bar-0", b(-500, 0, 180, 55, 620, 340).color(color));
p.part("bar-1", b(-375, 0, 180, 55, 620, 340).color(color));
p.part("bar-2", b(-250, 0, 180, 55, 620, 340).color(color));
p.part("bar-3", b(-125, 0, 180, 55, 620, 340).color(color));
p.part("bar-4", b(0, 0, 180, 55, 620, 340).color(color));
p.part("bar-5", b(125, 0, 180, 55, 620, 340).color(color));
p.part("bar-6", b(250, 0, 180, 55, 620, 340).color(color));
p.part("bar-7", b(375, 0, 180, 55, 620, 340).color(color));
p.part("bar-8", b(500, 0, 180, 55, 620, 340).color(color));
p.part("crossbeam-front", b(-550, 0, 100, 80, 760, 95).color(color));
p.part("crossbeam-back", b(550, 0, 100, 80, 760, 95).color(color));
p.part("vibrator-left", c(-430, 0, 340, 100, 80, 8).color(color));
p.part("vibrator-right", c(430, 0, 340, 100, 80, 8).color(color));

return p.model();
