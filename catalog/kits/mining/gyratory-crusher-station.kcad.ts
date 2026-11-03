// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "gyratory-crusher-station",
  license: 'CC0-1.0',
  title: "Gyratory crusher station",
  description: "Tall primary crusher station with portal frame, upper feed ring, main shell, and discharge opening. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6d736d", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("gyratory-crusher-station");
p.part("foundation", b(0, 0, 0, 1280, 980, 110).color(color));
p.part("column-left", b(-480, 0, 110, 145, 760, 1050).color(color));
p.part("column-right", b(480, 0, 110, 145, 760, 1050).color(color));
p.part("rear-column", b(0, 360, 110, 900, 150, 1050).color(color));
p.part("crusher-shell", c(0, 0, 140, 790, 360, 12).color(color));
p.part("feed-ring", c(0, 0, 900, 170, 520, 12).color(color));
p.part("top-bridge", b(0, 0, 1060, 1160, 220, 100).color(color));
p.part("discharge-chute", b(0, -430, 160, 480, 220, 260).color(color));

return p.model();
