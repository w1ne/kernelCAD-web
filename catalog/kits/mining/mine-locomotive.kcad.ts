// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mine-locomotive",
  license: 'CC0-1.0',
  title: "Underground mine locomotive",
  description: "Low-profile mine locomotive with enclosed cab, buffer ends, chassis, and paired wheel trucks. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#a26b40", { label: 'Asset color' });
const baseZ=5;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("mine-locomotive");
p.part("chassis", b(0, 0, 70, 900, 350, 140).color(color));
p.part("cab", b(-190, 0, 210, 360, 320, 360).color(color));
p.part("cab-roof", b(-190, 0, 570, 420, 370, 55).color(color));
p.part("front-buffer", b(455, 0, 120, 55, 440, 90).color(color));
p.part("rear-buffer", b(-455, 0, 120, 55, 440, 90).color(color));
p.part("front-wheel-near", hy(270, -190, 115, 90, 110, 8).color(color));
p.part("front-wheel-far", hy(270, 190, 115, 90, 110, 8).color(color));
p.part("rear-wheel-near", hy(-270, -190, 115, 90, 110, 8).color(color));
p.part("rear-wheel-far", hy(-270, 190, 115, 90, 110, 8).color(color));
p.part("battery-box", b(80, 0, 180, 220, 270, 180).color(color));

return p.model();
