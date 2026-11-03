// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "crop-trellis-frame",
  license: 'CC0-1.0',
  title: "Crop trellis frame",
  description: "A freestanding crop-support frame with a top tension rail, four uprights and a raised cross-tie. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6b8073", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("crop-trellis-frame");
p.part("foot-left-front", b(-600,-320,0,100,100,80).color(color));
p.part("foot-right-front", b(600,-320,0,100,100,80).color(color));
p.part("foot-left-back", b(-600,320,0,100,100,80).color(color));
p.part("foot-right-back", b(600,320,0,100,100,80).color(color));
p.part("post-left-front", b(-600,-320,80,45,45,1750).color(color));
p.part("post-right-front", b(600,-320,80,45,45,1750).color(color));
p.part("post-left-back", b(-600,320,80,45,45,1750).color(color));
p.part("post-right-back", b(600,320,80,45,45,1750).color(color));
p.part("top-rail", b(0,0,1785,1260,55,55).color(color));
p.part("mid-rail", b(0,0,1050,1180,38,38).color(color));
p.part("tension-anchor-left", c(-560,0,1650,80,42,10).color(color));
p.part("tension-anchor-right", c(560,0,1650,80,42,10).color(color));

return p.model();
