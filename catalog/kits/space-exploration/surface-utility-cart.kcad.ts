// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "surface-utility-cart",
  license: 'CC0-1.0',
  title: "Surface utility cart",
  description: "Small utility cart with a flat deck, raised push handle and four low polygon wheels. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#89806b", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("surface-utility-cart");
p.part("deck",b(0,0,360,900,600,70).color(color));
p.part("handle",b(0,250,760,760,50,50).color(color));
p.part("handle-post--330",b(-330,250,430,55,55,620).color(color));
p.part("handle-post-330",b(330,250,430,55,55,620).color(color));
p.part("wheel--330--330",c(-330,-330,0,90,95,8).color(color));
p.part("wheel--330-330",c(-330,330,0,90,95,8).color(color));
p.part("wheel-330--330",c(330,-330,0,90,95,8).color(color));
p.part("wheel-330-330",c(330,330,0,90,95,8).color(color));

return p.model();
