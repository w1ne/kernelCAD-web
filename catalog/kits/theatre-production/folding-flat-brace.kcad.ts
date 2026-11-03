// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "folding-flat-brace",
  license: 'CC0-1.0',
  title: "Folding flat brace",
  description: "Scenery-panel kick brace with a lower floor shoe, pivot plate and adjustable support rod. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#72747a", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("folding-flat-brace");
p.part("floor-shoe", b(0,0,0,250,240,55).color(color));
p.part("lower-bracket", b(0,0,50,220,90,160).color(color));
p.part("upper-bracket", b(0,0,1280,220,90,160).color(color));
p.part("brace-rail", b(0,0,210,70,65,980).color(color));
p.part("telescoping-rail", b(0,0,1110,52,50,420).color(color));
p.part("locking-tab", b(70,0,970,70,40,110).color(color));
p.part("panel-hook", b(0,0,1425,220,70,70).color(color));
p.part("pivot", c(0,-50,110,75,42,10).color(color));
p.part("locking-pin", c(0,-70,970,60,20,10).color(color));

return p.model();
