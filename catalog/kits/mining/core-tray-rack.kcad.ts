// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "core-tray-rack",
  license: 'CC0-1.0',
  title: "Exploration core tray rack",
  description: "Stackable core sample rack with three levels, long trays, end uprights, and top bracing. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8b7656", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("core-tray-rack");
p.part("base-left", b(-430, 0, 0, 70, 420, 85).color(color));
p.part("base-right", b(430, 0, 0, 70, 420, 85).color(color));
p.part("base-crossbar", b(0, 0, 0, 920, 70, 70).color(color));
p.part("core-tray-0", b(0, 0, 110, 850, 360, 75).color(color));
p.part("core-tray-1", b(0, 0, 350, 850, 360, 75).color(color));
p.part("core-tray-2", b(0, 0, 590, 850, 360, 75).color(color));
p.part("core-channel-0-0", b(-350, 0, 150, 28, 330, 25).color(color));
p.part("core-channel-0-1", b(-210, 0, 150, 28, 330, 25).color(color));
p.part("core-channel-0-2", b(-70, 0, 150, 28, 330, 25).color(color));
p.part("core-channel-0-3", b(70, 0, 150, 28, 330, 25).color(color));
p.part("core-channel-0-4", b(210, 0, 150, 28, 330, 25).color(color));
p.part("core-channel-1-0", b(-350, 0, 390, 28, 330, 25).color(color));
p.part("core-channel-1-1", b(-210, 0, 390, 28, 330, 25).color(color));
p.part("core-channel-1-2", b(-70, 0, 390, 28, 330, 25).color(color));
p.part("core-channel-1-3", b(70, 0, 390, 28, 330, 25).color(color));
p.part("core-channel-1-4", b(210, 0, 390, 28, 330, 25).color(color));
p.part("core-channel-2-0", b(-350, 0, 630, 28, 330, 25).color(color));
p.part("core-channel-2-1", b(-210, 0, 630, 28, 330, 25).color(color));
p.part("core-channel-2-2", b(-70, 0, 630, 28, 330, 25).color(color));
p.part("core-channel-2-3", b(70, 0, 630, 28, 330, 25).color(color));
p.part("core-channel-2-4", b(210, 0, 630, 28, 330, 25).color(color));
p.part("upright-left", b(-430, 0, 75, 60, 70, 800).color(color));
p.part("upright-right", b(430, 0, 75, 60, 70, 800).color(color));
p.part("top-crossbar", b(0, 0, 850, 920, 70, 65).color(color));
p.part("lifting-eye-left", c(-430, 0, 915, 45, 35, 8).color(color));
p.part("lifting-eye-right", c(430, 0, 915, 45, 35, 8).color(color));

return p.model();
