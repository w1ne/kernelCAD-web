// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "satellite-solar-wing",
  license: 'CC0-1.0',
  title: "Satellite solar wing",
  description: "Deployable satellite panel wing with a central spine and three framed panel sections. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#46556a", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("satellite-solar-wing");
p.part("spine",b(0,0,0,90,1100,70).color(color));
p.part("panel-0",b(0,-360,65,620,300,28).color(color));
p.part("panel-1",b(0,0,65,620,300,28).color(color));
p.part("panel-2",b(0,360,65,620,300,28).color(color));
p.part("crossbar-0",b(0,-360,20,650,38,30).color(color));
p.part("crossbar-1",b(0,0,20,650,38,30).color(color));
p.part("crossbar-2",b(0,360,20,650,38,30).color(color));
p.part("crossbar-3",b(0,720,20,650,38,30).color(color));

return p.model();
