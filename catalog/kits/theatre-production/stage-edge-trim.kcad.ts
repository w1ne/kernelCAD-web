// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "stage-edge-trim",
  license: 'CC0-1.0',
  title: "Stage edge trim",
  description: "Short modular stage-edge fascia section with corner return, fixing tabs and end cap. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6d727b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("stage-edge-trim");
p.part("fascia", b(0,0,0,1700,45,300).color(color));
p.part("top-lip", b(0,0,300,1740,75,55).color(color));
p.part("left-return", b(-840,150,0,45,300,300).color(color));
p.part("right-return", b(840,150,0,45,300,300).color(color));
p.part("fixing-tab-a", b(-560,70,65,100,180,55).color(color));
p.part("fixing-tab-b", b(0,70,65,100,180,55).color(color));
p.part("fixing-tab-c", b(560,70,65,100,180,55).color(color));
p.part("end-cap", b(850,0,0,50,90,300).color(color));
p.part("fastener-a", c(-560,0,100,72,24,10).color(color));
p.part("fastener-b", c(0,0,100,72,24,10).color(color));
p.part("fastener-c", c(560,0,100,72,24,10).color(color));

return p.model();
