// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "impact-crusher-module",
  license: 'CC0-1.0',
  title: "Impact crusher module",
  description: "Impact crusher housing with feed chute, inspection doors, drive motor, and a raised maintenance rail. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8a6d47", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("impact-crusher-module");
p.part("base-frame", b(0, 0, 0, 1180, 720, 90).color(color));
p.part("crusher-housing", b(0, 0, 210, 760, 610, 520).color(color));
p.part("feed-chute", b(0, 0, 730, 520, 460, 300).color(color));
p.part("access-door-left", b(-395, -100, 300, 35, 270, 280).color(color));
p.part("access-door-right", b(395, -100, 300, 35, 270, 280).color(color));
p.part("rotor-cap", c(0, 0, 310, 170, 220, 12).color(color));
p.part("motor", b(-550, 0, 105, 300, 340, 270).color(color));
p.part("service-rail", b(0, 390, 770, 1020, 45, 45).color(color));

return p.model();
