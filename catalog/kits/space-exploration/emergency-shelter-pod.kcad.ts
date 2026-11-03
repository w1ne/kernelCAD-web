// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "emergency-shelter-pod",
  license: 'CC0-1.0',
  title: "Emergency shelter pod",
  description: "Low emergency shelter capsule with raised end caps, foot pads and a top handle rail. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#c98c52", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("emergency-shelter-pod");
p.part("shell",b(0,0,80,1100,650,600).color(color));
p.part("top",b(0,0,680,950,520,80).color(color));
p.part("end-a",c(-475,0,380,600,240,8).color(color));
p.part("end-b",c(475,0,380,600,240,8).color(color));
p.part("handle",b(0,0,820,500,55,35).color(color));
p.part("foot--350",b(-350,0,0,150,240,80).color(color));
p.part("foot-350",b(350,0,0,150,240,80).color(color));

return p.model();
