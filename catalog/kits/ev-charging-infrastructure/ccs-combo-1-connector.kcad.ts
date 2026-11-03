// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ccs-combo-1-connector",
  license: 'CC0-1.0',
  title: "CCS Combo 1 connector",
  description: "Generic CCS Combo 1 plug body with a broad grip shell, lower contact block, and cable tail. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#4a555b", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("ccs-combo-1-connector");
p.part("hand-grip", b(0, 15, 0, 118, 112, 128).color(color));
p.part("front-coupling", b(0, -88.0, 28.16, 92.04, 64, 74.24).color(color));
p.part("connector-nose", hy(0, -124.0, 64.0, 96, 33.040000000000006, 10).color(color));
p.part("strain-relief", hy(0, 102.0, 64.0, 92, 26.88, 8).color(color));
p.part("cable-stub", hy(0, 201.0, 64.0, 210, 17.64, 8).color(color));
p.part("grip-ridge-top", b(0, 12, 138, 75.52, 51.52, 15).color(color));
p.part("lower-contact-block", b(0, -78.0, 0, 73.16, 50, 42).color(color));

return p.model();
