// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "landing-pad-marker",
  license: 'CC0-1.0',
  title: "Landing zone marker",
  description: "Low landing-zone marker with a broad base plate and raised guide posts at each corner. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#bd9750", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("landing-pad-marker");
p.part("plate",b(0,0,0,1200,1200,50).color(color));
p.part("post--460--460",b(-460,-460,25,70,70,370).color(color));
p.part("post--460-460",b(-460,460,25,70,70,370).color(color));
p.part("post-460--460",b(460,-460,25,70,70,370).color(color));
p.part("post-460-460",b(460,460,25,70,70,370).color(color));
p.part("center",b(0,0,30,320,320,20).color(color));

return p.model();
