// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "surface-sensor-post",
  license: 'CC0-1.0',
  title: "Surface sensor post",
  description: "Short instrument post with twin sensor boxes, a crossbar and three support feet. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7b8079", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("surface-sensor-post");
p.part("mast",c(0,0,0,1000,36,8).color(color));
p.part("sensor-a",b(0,0,740,270,220,180).color(color));
p.part("sensor-b",b(0,0,450,190,180,140).color(color));
p.part("crossbar",b(0,0,600,500,40,40).color(color));
p.part("foot-0",b(0,-130,0,200,70,40).color(color));
p.part("foot-1",b(-112,65,0,200,70,40).color(color));
p.part("foot-2",b(112,65,0,200,70,40).color(color));

return p.model();
