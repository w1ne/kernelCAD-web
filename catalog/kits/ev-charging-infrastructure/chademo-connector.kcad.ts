// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "chademo-connector",
  license: 'CC0-1.0',
  title: "CHAdeMO connector",
  description: "Generic CHAdeMO plug with a rounded hand shell, broad coupling nose, and cable strain relief. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#4c565a", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("chademo-connector");
p.part("hand-grip", b(0, 15, 0, 128, 120, 142).color(color));
p.part("front-coupling", b(0, -92.0, 31.24, 99.84, 64, 82.36).color(color));
p.part("connector-nose", hy(0, -132.0, 71.0, 104, 35.84, 10).color(color));
p.part("strain-relief", hy(0, 106.0, 71.0, 92, 29.44, 8).color(color));
p.part("cable-stub", hy(0, 205.0, 71.0, 210, 19.32, 8).color(color));
p.part("grip-ridge-top", b(0, 12, 152, 81.92, 55.2, 15).color(color));
p.part("lower-contact-block", b(0, -82.0, 0, 79.36, 50, 42).color(color));

return p.model();
