// SPDX-License-Identifier: CC0-1.0
// Orchestra shell panel: Freestanding acoustic-shell section with broad reflector face, folded side returns and support feet.

meta({
  name: "orchestra-shell-panel",
  license: 'CC0-1.0',
  title: "Orchestra shell panel",
  description: "Freestanding acoustic-shell section with broad reflector face, folded side returns and support feet. Knobs: overall scale; stage timber, painted steel, steel hardware; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const timber = param('timber', '#946b43', { label: 'Stage timber' });
const steel = param('steel', '#46515a', { label: 'Painted steel' });
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });

presets({
  houseShow: {
    timber: '#725137',
    steel: '#343b41',
    hardware: '#c5a052',
  },
  touring: {
    timber: '#cd914b',
    steel: '#315968',
    hardware: '#e2b347',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("orchestra-shell-panel");
p.part("reflector-face", b(0,0,170,1450,100,1880).color(timber));
p.part("left-return", b(-680,80,170,95,260,1850).color(steel));
p.part("right-return", b(680,80,170,95,260,1850).color(steel));
p.part("top-cap", b(0,10,2050,1470,280,65).color(steel));
p.part("rear-stiffener-low", b(0,80,280,1320,50,70).color(timber));
p.part("rear-stiffener-high", b(0,80,1540,1320,50,70).color(timber));
p.part("left-foot", b(-500,0,0,180,420,170).color(steel));
p.part("right-foot", b(500,0,0,180,420,170).color(steel));
p.part("hinge-left", c(-675,-100,220,100,32,10).color(hardware));
p.part("hinge-right", c(675,-100,220,100,32,10).color(hardware));



return p.model();
