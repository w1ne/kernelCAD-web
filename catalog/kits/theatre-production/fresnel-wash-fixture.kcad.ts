// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "fresnel-wash-fixture",
  license: 'CC0-1.0',
  title: "Fresnel wash fixture",
  description: "Compact Fresnel wash luminaire with a broad lens rim, rear vent body, yoke and clamp spigot. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#707580", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("fresnel-wash-fixture");
p.part("rear-case", b(0,0,250,300,300,300).color(color));
p.part("side-plate-left", b(-170,0,320,50,350,260).color(color));
p.part("side-plate-right", b(170,0,320,50,350,260).color(color));
p.part("yoke-arm-left", b(-220,0,145,45,55,360).color(color));
p.part("yoke-arm-right", b(220,0,145,45,55,360).color(color));
p.part("yoke-crossbar", b(0,0,500,470,55,55).color(color));
p.part("spigot", b(0,0,0,90,90,150).color(color));
p.part("barrel", c(0,0,430,250,125,10).color(color));
p.part("lens-rim", c(0,0,680,145,150,10).color(color));
p.part("focus-handle", c(0,-190,450,160,28,10).color(color));

return p.model();
