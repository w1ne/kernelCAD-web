// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "stage-stair-unit",
  license: 'CC0-1.0',
  title: "Stage stair unit",
  description: "Three-step stage access unit with boxed treads, side cheeks and rear stabilizing pads. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#707682", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("stage-stair-unit");
p.part("step-one", b(0,-300,0,760,320,190).color(color));
p.part("step-two", b(0,-50,190,760,320,190).color(color));
p.part("step-three", b(0,200,380,760,320,190).color(color));
p.part("left-cheek", b(-375,-20,0,55,900,570).color(color));
p.part("right-cheek", b(375,-20,0,55,900,570).color(color));
p.part("top-landing", b(0,500,570,760,280,60).color(color));
p.part("rear-brace", b(0,250,80,650,55,50).color(color));
p.part("front-foot-left", c(-300,-420,0,100,40,10).color(color));
p.part("front-foot-right", c(300,-420,0,100,40,10).color(color));

return p.model();
