// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mine-skip",
  license: 'CC0-1.0',
  title: "Mine skip conveyance",
  description: "Compact ore skip with reinforced side walls, guide rails, a top bail, and a discharge gate. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#786e58", { label: 'Asset color' });
const baseZ=30;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("mine-skip");
p.part("floor", b(0, 0, 35, 520, 430, 65).color(color));
p.part("side-left", b(-225, 0, 100, 60, 420, 530).color(color));
p.part("side-right", b(225, 0, 100, 60, 420, 530).color(color));
p.part("front-wall", b(0, -180, 100, 420, 55, 530).color(color));
p.part("back-wall", b(0, 180, 100, 420, 55, 530).color(color));
p.part("guide-left", b(-280, 0, 30, 35, 35, 690).color(color));
p.part("guide-right", b(280, 0, 30, 35, 35, 690).color(color));
p.part("lifting-pin", c(0, 0, 630, 65, 85, 10).color(color));
p.part("gate", b(0, -225, 70, 350, 35, 90).color(color));

return p.model();
