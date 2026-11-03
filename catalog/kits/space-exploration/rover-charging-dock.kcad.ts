// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "rover-charging-dock",
  license: 'CC0-1.0',
  title: "Rover charging dock",
  description: "Low charging dock with guide rails, raised connector post and two anchor pads. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#58676b", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("rover-charging-dock");
p.part("base",b(0,0,60,1150,700,120).color(color));
p.part("guide-left",b(0,-280,130,1050,70,90).color(color));
p.part("guide-right",b(0,280,130,1050,70,90).color(color));
p.part("post",c(0,250,180,540,95,8).color(color));
p.part("connector",b(0,180,650,180,160,120).color(color));
p.part("anchor--460",b(-460,0,0,120,180,60).color(color));
p.part("anchor-460",b(460,0,0,120,180,60).color(color));

return p.model();
