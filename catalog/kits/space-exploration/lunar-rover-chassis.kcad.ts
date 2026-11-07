// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "lunar-rover-chassis",
  license: 'CC0-1.0',
  title: "Lunar rover chassis",
  description: "Open rover frame with four wheel mounts, central deck, front bumper and rear cargo rail. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#9c8e6d", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("lunar-rover-chassis");
p.part("deck",b(0,0,330,1150,700,100).color(color));
p.part("front-bumper",b(0,-390,210,1250,80,80).color(color));
p.part("rear-rail",b(0,390,260,1100,45,110).color(color));
p.part("wheel-mount--460--360",b(-460,-360,0,160,150,100).color(color));
p.part("wheel-mount--460-360",b(-460,360,0,160,150,100).color(color));
p.part("wheel-mount-460--360",b(460,-360,0,160,150,100).color(color));
p.part("wheel-mount-460-360",b(460,360,0,160,150,100).color(color));

return p.model();
