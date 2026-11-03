// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "orchestra-shell-panel",
  license: 'CC0-1.0',
  title: "Orchestra shell panel",
  description: "Freestanding acoustic-shell section with broad reflector face, folded side returns and support feet. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7a715f", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("orchestra-shell-panel");
p.part("reflector-face", b(0,0,170,1450,100,1880).color(color));
p.part("left-return", b(-680,80,170,95,260,1850).color(color));
p.part("right-return", b(680,80,170,95,260,1850).color(color));
p.part("top-cap", b(0,10,2050,1470,280,65).color(color));
p.part("rear-stiffener-low", b(0,80,280,1320,50,70).color(color));
p.part("rear-stiffener-high", b(0,80,1540,1320,50,70).color(color));
p.part("left-foot", b(-500,0,0,180,420,170).color(color));
p.part("right-foot", b(500,0,0,180,420,170).color(color));
p.part("hinge-left", c(-675,-100,220,100,32,10).color(color));
p.part("hinge-right", c(675,-100,220,100,32,10).color(color));

return p.model();
