// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "scenic-wagon",
  license: 'CC0-1.0',
  title: "Scenic wagon",
  description: "Low rolling scenery wagon with a deck, corner posts, push bar and four wheel housings. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6b717b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("scenic-wagon");
p.part("deck", b(0,0,220,1500,920,90).color(color));
p.part("front-stop", b(0,-430,310,1450,45,100).color(color));
p.part("back-stop", b(0,430,310,1450,45,100).color(color));
p.part("post-left-front", b(-680,-400,310,55,55,700).color(color));
p.part("post-right-front", b(680,-400,310,55,55,700).color(color));
p.part("post-left-back", b(-680,400,310,55,55,700).color(color));
p.part("post-right-back", b(680,400,310,55,55,700).color(color));
p.part("handle-left", b(-760,400,220,55,55,770).color(color));
p.part("handle-right", b(760,400,220,55,55,770).color(color));
p.part("handle-top", b(0,400,990,1560,55,55).color(color));
p.part("caster-a", c(-640,-380,0,190,62,10).color(color));
p.part("caster-b", c(640,-380,0,190,62,10).color(color));
p.part("caster-c", c(-640,380,0,190,62,10).color(color));
p.part("caster-d", c(640,380,0,190,62,10).color(color));

return p.model();
