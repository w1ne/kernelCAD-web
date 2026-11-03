// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "curtain-track-carrier",
  license: 'CC0-1.0',
  title: "Curtain track carrier",
  description: "Compact trolley carriage with roller wheels, curtain hook and end-stop tab. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#74747b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("curtain-track-carrier");
p.part("carriage", b(0,0,95,280,100,70).color(color));
p.part("hook-stem", b(0,-20,0,42,42,115).color(color));
p.part("hook-tip", b(0,-35,0,105,42,38).color(color));
p.part("left-cheek", b(-112,0,95,40,150,85).color(color));
p.part("right-cheek", b(112,0,95,40,150,85).color(color));
p.part("stop-tab", b(130,0,165,45,55,70).color(color));
p.part("wheel-left", c(-90,0,150,85,39,10).color(color));
p.part("wheel-right", c(90,0,150,85,39,10).color(color));
p.part("hanger-eye", c(0,0,0,68,30,10).color(color));

return p.model();
