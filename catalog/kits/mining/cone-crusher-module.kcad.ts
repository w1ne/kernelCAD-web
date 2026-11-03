// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "cone-crusher-module",
  license: 'CC0-1.0',
  title: "Cone crusher module",
  description: "Cone crushing station with feed hopper, nested crusher body, access deck, and drive cabinet. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#65756f", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("cone-crusher-module");
p.part("base-skid", b(0, 0, 0, 920, 720, 80).color(color));
p.part("support-left", b(-310, 0, 80, 110, 600, 650).color(color));
p.part("support-right", b(310, 0, 80, 110, 600, 650).color(color));
p.part("crusher-shell", c(0, 0, 170, 520, 285, 12).color(color));
p.part("inner-cone", c(0, 0, 280, 410, 180, 10).color(color));
p.part("top-bowl", c(0, 0, 670, 95, 340, 12).color(color));
p.part("feed-box", b(0, 0, 760, 620, 580, 150).color(color));
p.part("service-deck", b(0, 400, 570, 1050, 180, 45).color(color));
p.part("drive-cabinet", b(-500, -280, 90, 180, 200, 360).color(color));

return p.model();
