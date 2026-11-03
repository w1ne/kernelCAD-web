// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "satellite-bus",
  license: 'CC0-1.0',
  title: "Satellite bus",
  description: "Rectangular satellite bus with corner rails, top sensor block and two side panel mounts. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#aaa99c", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("satellite-bus");
p.part("bus",b(0,0,30,700,600,600).color(color));
p.part("top-sensor",b(0,0,350,260,260,100).color(color));
p.part("corner--320--270",b(-320,-270,0,40,40,660).color(color));
p.part("corner--320-270",b(-320,270,0,40,40,660).color(color));
p.part("corner-320--270",b(320,-270,0,40,40,660).color(color));
p.part("corner-320-270",b(320,270,0,40,40,660).color(color));
p.part("panel-mount-left",b(-430,0,110,180,60,80).color(color));
p.part("panel-mount-right",b(430,0,110,180,60,80).color(color));

return p.model();
