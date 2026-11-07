// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "scenic-flat-panel",
  license: 'CC0-1.0',
  title: "Scenic flat panel",
  description: "Lightweight scenery flat with a broad facing, perimeter rails, two battens and foot blocks. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#756f65", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("scenic-flat-panel");
p.part("face", b(0,0,0,1500,85,2100).color(color));
p.part("left-stile", b(-700,55,0,75,55,2100).color(color));
p.part("right-stile", b(700,55,0,75,55,2100).color(color));
p.part("top-rail", b(0,55,2030,1400,55,70).color(color));
p.part("bottom-rail", b(0,55,0,1400,55,70).color(color));
p.part("batten-low", b(0,60,480,1380,45,50).color(color));
p.part("batten-high", b(0,60,1560,1380,45,50).color(color));
p.part("foot-left", b(-650,-20,0,150,300,85).color(color));
p.part("foot-right", b(650,-20,0,150,300,85).color(color));
p.part("hinge-pin-left", c(-680,-75,700,75,26,10).color(color));
p.part("hinge-pin-right", c(680,-75,700,75,26,10).color(color));

return p.model();
