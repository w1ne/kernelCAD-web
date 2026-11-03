// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ccs-combo-2-connector",
  license: 'CC0-1.0',
  title: "CCS Combo 2 connector",
  description: "Generic CCS Combo 2 plug body with a shaped grip, strain relief, and cable tail. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#424f55", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("ccs-combo-2-connector");
p.part("hand-grip", b(0, 15, 0, 112, 110, 132).color(color));
p.part("front-coupling", b(0, -87.0, 29.04, 87.36, 64, 76.55999999999999).color(color));
p.part("connector-nose", hy(0, -121.0, 66.0, 92, 31.360000000000003, 10).color(color));
p.part("strain-relief", hy(0, 101.0, 66.0, 92, 25.6, 8).color(color));
p.part("cable-stub", hy(0, 200.0, 66.0, 210, 16.8, 8).color(color));
p.part("grip-ridge-top", b(0, 12, 142, 71.68, 50.6, 15).color(color));
p.part("lower-contact-block", b(0, -77.0, 0, 69.44, 50, 42).color(color));

return p.model();
