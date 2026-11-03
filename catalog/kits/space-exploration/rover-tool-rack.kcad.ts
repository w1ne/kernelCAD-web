// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "rover-tool-rack",
  license: 'CC0-1.0',
  title: "Rover tool rack",
  description: "Open rack with three long tool channels, end stops and four mounting feet. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6c7475", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("rover-tool-rack");
p.part("base",b(0,0,80,880,420,90).color(color));
p.part("channel-0",b(0,-140,170,760,54,70).color(color));
p.part("channel-1",b(0,0,170,760,54,70).color(color));
p.part("channel-2",b(0,140,170,760,54,70).color(color));
p.part("end-left",b(-400,0,220,50,460,250).color(color));
p.part("end-right",b(400,0,220,50,460,250).color(color));
p.part("foot--340",b(-340,0,0,100,120,80).color(color));
p.part("foot-340",b(340,0,0,100,120,80).color(color));

return p.model();
