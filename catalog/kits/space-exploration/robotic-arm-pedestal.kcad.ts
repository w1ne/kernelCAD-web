// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "robotic-arm-pedestal",
  license: 'CC0-1.0',
  title: "Instrument arm pedestal",
  description: "Static instrument-arm pedestal with a broad base, two block links and a tool-end mount. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#797e79", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("robotic-arm-pedestal");
p.part("base",b(0,0,0,520,520,70).color(color));
p.part("turntable",c(0,0,35,90,180,8).color(color));
p.part("lower-link",b(0,0,295,180,180,460).color(color));
p.part("upper-link",b(160,0,635,480,150,150).color(color));
p.part("joint",c(380,0,665,180,85,8).color(color));
p.part("tool-mount",b(520,0,685,160,180,100).color(color));

return p.model();
