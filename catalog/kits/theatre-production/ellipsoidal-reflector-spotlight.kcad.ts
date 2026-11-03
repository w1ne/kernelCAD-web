// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ellipsoidal-reflector-spotlight",
  license: 'CC0-1.0',
  title: "Ellipsoidal reflector spotlight",
  description: "Theatre profile fixture with a horizontal barrel, forward-facing lens, rear housing, yoke and focus control. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'center',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#686f79", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("ellipsoidal-reflector-spotlight");
p.part("rear-housing", b(0,0,100,300,340,280).color(color));
p.part("barrel", cy(0,30,240,540,95,10).color(color));
p.part("front-shutter-top", b(0,-520,330,220,40,100).color(color));
p.part("front-shutter-left", b(-100,-520,210,40,40,180).color(color));
p.part("front-shutter-right", b(100,-520,210,40,40,180).color(color));
p.part("yoke-left", b(-210,0,0,45,55,380).color(color));
p.part("yoke-right", b(210,0,0,45,55,380).color(color));
p.part("yoke-crossbar", b(0,0,45,420,55,55).color(color));
p.part("focus-knob", c(215,0,260,90,48,10).color(color));
p.part("stirrup-eye", c(0,0,380,100,38,10).color(color));
p.part("lens-rim", cy(0,-500,240,70,113,10).color(color));
p.part("lens", cy(0,-510,240,50,88,10).color(color));

return p.model();
